/**
 * Atomic Payment Collection & Receipt Issuance Module
 *
 * Implements the 11-step PostgreSQL Serializable / Row-Locked Transaction:
 * 1. Validate authenticated staff member & permissions.
 * 2. Validate student & payment input payload (never accepts card PAN/CVV/PIN).
 * 3. Check idempotencyKey — return existing committed receipt if retried.
 * 4. Lock affected student charges with SELECT ... FOR UPDATE.
 * 5. Recalculate current outstanding balances inside the transaction.
 * 6. Validate manual or oldest-first allocations and advance credit remainder.
 * 7. Insert the Payment record (CASH or UPI only).
 * 8. Insert PaymentAllocation rows and update StudentCharge statuses.
 * 9. Increment ReceiptSequence atomically and allocate unique receipt number.
 * 10. Create immutable Receipt record with amount-in-words & remaining balance snapshot.
 * 11. Commit all changes atomically before returning receipt to the client.
 */
import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createAuthMiddleware } from '../../middleware/auth.middleware.js';
import {
  calculateStudentLedger,
  buildAndValidateAllocationPlan,
  formatReceiptNumber,
  amountToIndianWords,
  validateSupportedPaymentMethod,
} from '../../services/ledger-engine.js';
import { recordAuditLog } from '../../services/audit.service.js';

const createPaymentSchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  studentId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  amountReceived: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.enum(['CASH', 'UPI']),
  transactionReference: z.string().max(120).optional(),
  payerName: z.string().max(120).optional(),
  collectorNameAcknowledgment: z.string().min(2).max(120).optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(300).optional(),

  manualAllocations: z
    .array(
      z.object({
        studentChargeId: z.string().uuid(),
        allocatedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      })
    )
    .optional(),
});

export function createPaymentsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  // POST /api/v1/payments — Atomic Fee Payment Collection
  router.post('/', requireAuth, requirePermission('PAYMENT_COLLECT'), async (req, res, next) => {
    try {
      // Strictly reject any payload attempting to submit raw card numbers, CVV, or PIN
      const rawBodyKeys = Object.keys(req.body || {});
      const forbiddenCardKeys = ['cardNumber', 'card_number', 'cvv', 'cvc', 'pin', 'expiry'];
      for (const key of forbiddenCardKeys) {
        if (rawBodyKeys.includes(key)) {
          res.status(400).json({
            error: 'FORBIDDEN_CARD_DATA',
            message: 'Storing raw card numbers, CVV, or PIN is strictly prohibited. Only enter an optional POS reference ID.',
          });
          return;
        }
      }

      const methodCheck = validateSupportedPaymentMethod(req.body?.paymentMethod);
      if (!methodCheck.valid) {
        res.status(400).json({
          error: methodCheck.errorCode,
          message: methodCheck.message,
        });
        return;
      }

      const parsed = createPaymentSchema.parse(req.body);

      // Step 3: Fast Idempotency Check before opening write lock
      const existingByIdempotency = await prisma.payment.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        include: { receipt: true, allocations: true },
      });

      if (existingByIdempotency) {
        res.status(200).json({
          idempotentReplay: true,
          payment: existingByIdempotency,
          receipt: existingByIdempotency.receipt,
        });
        return;
      }

      // Execute Steps 4–11 inside a single Serializable PostgreSQL Transaction
      const result = await prisma.$transaction(
        async (tx) => {
          // Re-verify idempotency inside transaction
          const replayCheck = await tx.payment.findUnique({
            where: { idempotencyKey: parsed.idempotencyKey },
            include: { receipt: true, allocations: true },
          });
          if (replayCheck) {
            return { idempotentReplay: true, payment: replayCheck, receipt: replayCheck.receipt };
          }

          // Step 4: Row-level lock on student's charges to prevent concurrent cashier over-allocation
          await tx.$queryRaw`
            SELECT id FROM student_charges
            WHERE enrollment_id = ${parsed.enrollmentId}
            FOR UPDATE
          `;

          const settings = await tx.schoolSettings.findUnique({ where: { id: 1 } });
          const student = await tx.student.findUniqueOrThrow({
            where: { id: parsed.studentId },
          });
          const enrollment = await tx.enrollment.findUniqueOrThrow({
            where: { id: parsed.enrollmentId },
            include: { academicYear: true, schoolClass: true, section: true },
          });

          if (enrollment.studentId !== student.id) {
            throw new Error('Enrollment does not belong to the specified student.');
          }

          // Step 5: Load current charges and allocations to recalculate exact outstanding balances
          const dbCharges = await tx.studentCharge.findMany({
            where: { enrollmentId: enrollment.id },
            include: {
              feeHead: true,
              paymentAllocations: {
                include: { payment: true },
              },
            },
            orderBy: { dueDate: 'asc' },
          });

          const chargeOwnershipMap = new Map<string, string>();
          const chargeInputs = dbCharges.map((c) => {
            chargeOwnershipMap.set(c.id, student.id);
            return {
              id: c.id,
              studentId: student.id,
              enrollmentId: enrollment.id,
              feeHeadCode: c.feeHead.code,
              feeHeadName: c.feeHead.name,
              feePeriodCode: c.feePeriodCode,
              feePeriodLabel: c.feePeriodLabel,
              dueDate: c.dueDate.toISOString().slice(0, 10),
              originalAmount: c.originalAmount.toString(),
              concessionAmount: c.concessionAmount.toString(),
              adjustmentAmount: c.adjustmentAmount.toString(),
              status: c.status,
            };
          });

          const allocInputs = dbCharges.flatMap((c) =>
            c.paymentAllocations.map((pa) => ({
              id: pa.id,
              paymentId: pa.paymentId,
              studentChargeId: pa.studentChargeId,
              allocatedAmount: pa.allocatedAmount.toString(),
              isActive: pa.isActive,
              paymentStatus: pa.payment.status,
              paymentMethod: pa.payment.paymentMethod,
              
            }))
          );

          const ledgerBefore = calculateStudentLedger(student.id, chargeInputs, allocInputs, '0.00');

          // Step 6: Validate Allocations & Advance Credit
          const plan = buildAndValidateAllocationPlan({
            studentId: student.id,
            amountReceived: parsed.amountReceived,
            ledgerCharges: ledgerBefore.charges,
            chargeOwnershipMap,
            manualAllocations: parsed.manualAllocations,
            autoAllocateOldestFirst: settings?.autoAllocateOldestFirst ?? true,
            allowAdvanceCredit: true,
          });

          const paymentStatus = PaymentStatus.COMPLETED;

          // Step 7: Insert Payment Record
          const payment = await tx.payment.create({
            data: {
              idempotencyKey: parsed.idempotencyKey,
              studentId: student.id,
              enrollmentId: enrollment.id,
              academicYearId: parsed.academicYearId,
              amountReceived: plan.amountReceived,
              amountAllocated: plan.amountAllocated,
              advanceCreditAmount: plan.advanceCreditAmount,
              paymentMethod: parsed.paymentMethod,
              status: paymentStatus,
              transactionReference: parsed.transactionReference,
              payerName: parsed.payerName,
              transferDate: parsed.transferDate ? new Date(parsed.transferDate) : null,
              notes: parsed.notes,
              collectedById: req.staff!.id,
            },
          });



          // Step 8: Insert Payment Allocations & Update Charge Statuses
          for (const item of plan.allocations) {
            await tx.paymentAllocation.create({
              data: {
                paymentId: payment.id,
                studentChargeId: item.studentChargeId,
                allocatedAmount: item.allocatedAmount,
                isActive: true,
              },
            });

            if (paymentStatus === PaymentStatus.COMPLETED) {
              await tx.studentCharge.update({
                where: { id: item.studentChargeId },
                data: { status: item.newChargeStatus },
              });
            }
          }

          // Record Advance Credit if unallocated remainder > 0
          if (Number(plan.advanceCreditAmount) > 0) {
            await tx.studentCredit.create({
              data: {
                studentId: student.id,
                sourcePaymentId: payment.id,
                originalAmount: plan.advanceCreditAmount,
                remainingAmount: plan.advanceCreditAmount,
                reason: `Unallocated advance from payment ${payment.id}`,
                isActive: true,
              },
            });
          }

          // Step 9: Allocate Unique Sequential Server-Side Receipt Number
          const prefix = settings?.receiptPrefix || 'SVSS';
          const seqRow = await tx.receiptSequence.upsert({
            where: {
              academicYearId_prefix: {
                academicYearId: enrollment.academicYearId,
                prefix,
              },
            },
            update: { lastNumber: { increment: 1 } },
            create: {
              academicYearId: enrollment.academicYearId,
              prefix,
              lastNumber: 1,
            },
          });

          const receiptNumber = formatReceiptNumber(
            prefix,
            enrollment.academicYear.code,
            seqRow.lastNumber
          );

          const remainingAfterPayment =
            paymentStatus === PaymentStatus.COMPLETED
              ? Math.max(
                  0,
                  Number(ledgerBefore.totalOutstandingBalance) - Number(plan.amountAllocated)
                ).toFixed(2)
              : ledgerBefore.totalOutstandingBalance;

          const amountWords = amountToIndianWords(plan.amountReceived);

          const receiptSnapshot = {
            schoolName: settings?.schoolName ?? 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
            schoolAddress: `${settings?.addressLine1 ?? 'Haripur, Karaudi Kalan, Kadipur'}, ${settings?.addressLine2 ?? 'Sultanpur, Uttar Pradesh 228161'}`,
            schoolPhone: settings?.primaryPhone ?? '+91-532-2400108',
            receiptNumber,
            paidAt: payment.paidAt.toISOString(),
            academicSession: enrollment.academicYear.code,
            studentName: student.fullName,
            admissionNumber: student.admissionNumber,
            className: enrollment.schoolClass.name,
            sectionName: enrollment.section.name,
            guardianName: student.guardianName,
            paymentMethod: payment.paymentMethod,
            paymentStatus: payment.status,
            transactionReference: payment.transactionReference,
            
            allocations: plan.allocations,
            amountReceived: plan.amountReceived,
            amountAllocated: plan.amountAllocated,
            advanceCreditAmount: plan.advanceCreditAmount,
            amountInWords: amountWords,
            remainingBalanceSnapshot: remainingAfterPayment,
            cashierName: parsed.collectorNameAcknowledgment?.trim() || req.staff!.fullName,
            cashierUsername: req.staff!.username,
          };

          // Step 10: Create Receipt Record
          const receipt = await tx.receipt.create({
            data: {
              receiptNumber,
              paymentId: payment.id,
              studentId: student.id,
              academicYearId: enrollment.academicYearId,
              issuedById: req.staff!.id,
              amountInWords: amountWords,
              remainingBalanceSnapshot: remainingAfterPayment,
              snapshotPayloadJson: JSON.stringify(receiptSnapshot),
            },
          });

          await recordAuditLog(tx, {
            actorUserId: req.staff!.id,
            actorUsername: req.staff!.username,
            actorRole: req.staff!.roles.join(','),
            action: 'PAYMENT_COLLECTED_AND_RECEIPT_ISSUED',
            entityType: 'PAYMENT',
            entityId: payment.id,
            summary: `Collected ₹${plan.amountReceived} (${payment.paymentMethod}) from ${student.fullName} (${student.admissionNumber}), Receipt ${receiptNumber}`,
            metadata: {
              receiptNumber,
              amountReceived: plan.amountReceived,
              amountAllocated: plan.amountAllocated,
              advanceCreditAmount: plan.advanceCreditAmount,
              paymentMethod: payment.paymentMethod,
            },
            ipAddress: req.ip,
          });

          return { idempotentReplay: false, payment, receipt, snapshot: receiptSnapshot };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        }
      );

      res.status(result.idempotentReplay ? 200 : 201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/payments/reconcile/:idempotencyKey — Reconcile Uncertain Payment Outcome (Problem 8)
  router.get('/reconcile/:idempotencyKey', requireAuth, requirePermission('PAYMENT_COLLECT'), async (req, res, next) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { idempotencyKey: req.params.idempotencyKey },
        include: {
          receipt: true,
          allocations: { include: { studentCharge: { include: { feeHead: true } } } },
        },
      });
      if (!payment) {
        res.json({ found: false, payment: null, receipt: null });
        return;
      }
      res.json({ found: true, payment, receipt: payment.receipt });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/payments — List & Filter Payments
  router.get('/', requireAuth, requirePermission('REPORTS_VIEW_DAILY'), async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 25)));
      const paymentMethod = req.query.paymentMethod as PaymentMethod | undefined;
      const academicYearId = req.query.academicYearId as string | undefined;
      const studentId = req.query.studentId as string | undefined;
      const idempotencyKey = req.query.idempotencyKey as string | undefined;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      const where: Prisma.PaymentWhereInput = {
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(academicYearId ? { academicYearId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...(fromDate || toDate
          ? {
              paidAt: {
                ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
                ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      };

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { paidAt: 'desc' },
          include: {
            student: { select: { id: true, admissionNumber: true, fullName: true } },
            receipt: true,
              collectedBy: { select: { id: true, fullName: true, username: true } },
            allocations: { include: { studentCharge: { include: { feeHead: true } } } },
          },
        }),
      ]);

      res.json({ page, pageSize, total, payments });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
