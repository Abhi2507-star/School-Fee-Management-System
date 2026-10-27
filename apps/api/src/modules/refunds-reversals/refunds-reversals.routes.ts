/**
 * Refunds & Reversals Module with Strict Dual-Control (Maker-Checker) Enforcement
 * - Completed financial records are NEVER deleted.
 * - Reversals deactivate allocations, restore student charge balances, mark original receipt as cancelled by reversal, and log actor + approver + reason.
 * - Refunds validate remaining refundable balance so excess refunds are impossible.
 */
import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, ApprovalStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createAuthMiddleware } from '../../middleware/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { toPaise, fromPaise } from '../../utils/money.js';

export function createRefundsReversalsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  // GET /api/v1/approvals — Retrieve Pending & Recent Concessions, Reversals, and Refunds
  router.get('/approvals', requireAuth, requirePermission('CONCESSION_APPROVE'), async (req, res, next) => {
    try {
      const academicYearId = req.query.academicYearId as string | undefined;
      const [concessions, reversals, refunds] = await Promise.all([
        prisma.concession.findMany({
          where: academicYearId ? { enrollment: { academicYearId } } : undefined,
          orderBy: { requestedAt: 'desc' },
          take: 50,
          include: {
            student: { select: { id: true, admissionNumber: true, fullName: true } },
            studentCharge: { include: { feeHead: true } },
            requestedBy: { select: { id: true, fullName: true, username: true } },
            approvedBy: { select: { id: true, fullName: true, username: true } },
          },
        }),
        prisma.reversal.findMany({
          where: academicYearId ? { payment: { academicYearId } } : undefined,
          orderBy: { requestedAt: 'desc' },
          take: 50,
          include: {
            payment: {
              include: {
                student: { select: { id: true, admissionNumber: true, fullName: true } },
                receipt: { select: { receiptNumber: true } },
              },
            },
            requestedBy: { select: { id: true, fullName: true, username: true } },
            approvedBy: { select: { id: true, fullName: true, username: true } },
          },
        }),
        prisma.refund.findMany({
          where: academicYearId ? { payment: { academicYearId } } : undefined,
          orderBy: { requestedAt: 'desc' },
          take: 50,
          include: {
            payment: {
              include: {
                student: { select: { id: true, admissionNumber: true, fullName: true } },
                receipt: { select: { receiptNumber: true } },
              },
            },
            requestedBy: { select: { id: true, fullName: true, username: true } },
            approvedBy: { select: { id: true, fullName: true, username: true } },
          },
        }),
      ]);

      res.json({ concessions, reversals, refunds });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/payments/:id/reversal-requests — Request Payment Reversal
  router.post('/payments/:id/reversal-requests', requireAuth, requirePermission('REVERSAL_REQUEST'), async (req, res, next) => {
    try {
      const { reason } = z.object({ reason: z.string().min(10).max(400) }).parse(req.body);
      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { receipt: true, reversals: true },
      });

      if (payment.status === PaymentStatus.REVERSED) {
        res.status(409).json({ error: 'ALREADY_REVERSED', message: 'This payment has already been reversed.' });
        return;
      }

      const pendingReversal = payment.reversals.find((r) => r.status === ApprovalStatus.PENDING);
      if (pendingReversal) {
        res.status(409).json({ error: 'REVERSAL_ALREADY_PENDING', message: 'A reversal request is already pending approval for this payment.' });
        return;
      }

      const reversal = await prisma.$transaction(async (tx) => {
        const rev = await tx.reversal.create({
          data: {
            paymentId: payment.id,
            originalReceipt: payment.receipt?.receiptNumber ?? 'N/A',
            reversedAmount: payment.amountReceived,
            reason,
            status: ApprovalStatus.PENDING,
            requestedById: req.staff!.id,
          },
        });

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'REVERSAL_REQUESTED',
          entityType: 'REVERSAL',
          entityId: rev.id,
          summary: `Requested reversal of payment ${payment.id} (Receipt ${rev.originalReceipt}, ₹${payment.amountReceived}). Reason: ${reason}`,
          ipAddress: req.ip,
        });

        return rev;
      });

      res.status(201).json({ reversal });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/reversals/:id/review — Approve or Reject Reversal (Maker-Checker Enforced)
  router.post('/reversals/:id/review', requireAuth, requirePermission('REVERSAL_APPROVE'), async (req, res, next) => {
    try {
      const { decision, reviewNotes } = z.object({
        decision: z.enum(['APPROVED', 'REJECTED']),
        reviewNotes: z.string().min(3).max(300),
      }).parse(req.body);

      const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });

      const updatedReversal = await prisma.$transaction(async (tx) => {
        const rev = await tx.reversal.findUniqueOrThrow({
          where: { id: req.params.id },
          include: { payment: { include: { allocations: true, receipt: true } } },
        });

        if (rev.status !== ApprovalStatus.PENDING) {
          throw new Error('This reversal request has already been reviewed.');
        }

        if ((settings?.requireDualControlReversal ?? true) && rev.requestedById === req.staff!.id) {
          throw new Error('Maker-checker policy violation: The requester of a reversal cannot approve their own request.');
        }

        const nextStatus = decision === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        const result = await tx.reversal.update({
          where: { id: rev.id },
          data: {
            status: nextStatus,
            approvedById: req.staff!.id,
            reviewedAt: new Date(),
            reviewNotes,
          },
        });

        if (decision === 'APPROVED') {
          await tx.payment.update({
            where: { id: rev.paymentId },
            data: { status: PaymentStatus.REVERSED },
          });

          await tx.paymentAllocation.updateMany({
            where: { paymentId: rev.paymentId },
            data: { isActive: false },
          });

          await tx.studentCredit.updateMany({
            where: { sourcePaymentId: rev.paymentId },
            data: { isActive: false, remainingAmount: '0.00' },
          });

          if (rev.payment.receipt) {
            await tx.receipt.update({
              where: { id: rev.payment.receipt.id },
              data: { isCancelledByReversal: true },
            });
          }

          // Recompute status of each affected student charge
          for (const alloc of rev.payment.allocations) {
            const remainingActiveAllocs = await tx.paymentAllocation.findMany({
              where: { studentChargeId: alloc.studentChargeId, isActive: true },
            });
            const remainingPaidPaise = remainingActiveAllocs.reduce(
              (acc, a) => acc + toPaise(a.allocatedAmount.toString()),
              0
            );
            await tx.studentCharge.update({
              where: { id: alloc.studentChargeId },
              data: { status: remainingPaidPaise > 0 ? 'PARTIALLY_PAID' : 'UNPAID' },
            });
          }
        }

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: `REVERSAL_${decision}`,
          entityType: 'REVERSAL',
          entityId: rev.id,
          summary: `${decision} reversal for Receipt ${rev.originalReceipt} (₹${rev.reversedAmount}). Notes: ${reviewNotes}`,
          ipAddress: req.ip,
        });

        return result;
      });

      res.json({ reversal: updatedReversal });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/refunds — Submit Refund Request with Excess-Refund Validation
  router.post('/refunds', requireAuth, requirePermission('REVERSAL_REQUEST'), async (req, res, next) => {
    try {
      const schema = z.object({
        paymentId: z.string().uuid(),
        refundAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        refundMethod: z.enum(['CASH', 'UPI']),
        reason: z.string().min(8).max(300),
        referenceNumber: z.string().optional(),
      });
      const parsed = schema.parse(req.body);

      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: parsed.paymentId },
        include: { refunds: true },
      });

      if (payment.status === PaymentStatus.REVERSED) {
        res.status(400).json({ error: 'PAYMENT_NOT_REFUNDABLE', message: 'Reversed payments cannot be refunded.' });
        return;
      }

      const existingRefundedPaise = payment.refunds
        .filter((r) => r.status === ApprovalStatus.APPROVED || r.status === ApprovalStatus.PENDING)
        .reduce((acc, r) => acc + toPaise(r.refundAmount.toString()), 0);

      const requestedPaise = toPaise(parsed.refundAmount);
      const maxRefundablePaise = toPaise(payment.amountReceived.toString()) - existingRefundedPaise;

      if (requestedPaise <= 0 || requestedPaise > maxRefundablePaise) {
        res.status(400).json({
          error: 'EXCESS_REFUND_AMOUNT',
          message: `Refund amount (₹${fromPaise(requestedPaise)}) exceeds remaining refundable balance (₹${fromPaise(maxRefundablePaise)}).`,
        });
        return;
      }

      const refund = await prisma.$transaction(async (tx) => {
        const created = await tx.refund.create({
          data: {
            paymentId: payment.id,
            refundAmount: parsed.refundAmount,
            refundMethod: parsed.refundMethod,
            reason: parsed.reason,
            referenceNumber: parsed.referenceNumber,
            status: ApprovalStatus.PENDING,
            requestedById: req.staff!.id,
          },
        });

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'REFUND_REQUESTED',
          entityType: 'REFUND',
          entityId: created.id,
          summary: `Requested refund of ₹${parsed.refundAmount} on payment ${payment.id}. Reason: ${parsed.reason}`,
          ipAddress: req.ip,
        });

        return created;
      });

      res.status(201).json({ refund });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/refunds/:id/review — Approve or Reject Refund
  router.post('/refunds/:id/review', requireAuth, requirePermission('REVERSAL_APPROVE'), async (req, res, next) => {
    try {
      const { decision, reviewNotes } = z.object({
        decision: z.enum(['APPROVED', 'REJECTED']),
        reviewNotes: z.string().min(3).max(300),
      }).parse(req.body);

      const updated = await prisma.$transaction(async (tx) => {
        const refund = await tx.refund.findUniqueOrThrow({
          where: { id: req.params.id },
          include: { payment: { include: { refunds: true } } },
        });

        if (refund.status !== ApprovalStatus.PENDING) {
          throw new Error('Refund request has already been processed.');
        }

        if (refund.requestedById === req.staff!.id) {
          throw new Error('Maker-checker policy violation: You cannot approve your own refund request.');
        }

        const nextStatus = decision === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        const result = await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: nextStatus,
            approvedById: req.staff!.id,
            processedAt: new Date(),
            reviewNotes,
          },
        });

        if (decision === 'APPROVED') {
          const totalApprovedPaise =
            refund.payment.refunds
              .filter((r) => r.status === ApprovalStatus.APPROVED)
              .reduce((acc, r) => acc + toPaise(r.refundAmount.toString()), 0) +
            toPaise(refund.refundAmount.toString());

          const receivedPaise = toPaise(refund.payment.amountReceived.toString());
          await tx.payment.update({
            where: { id: refund.paymentId },
            data: {
              status:
                totalApprovedPaise >= receivedPaise
                  ? PaymentStatus.REFUNDED
                  : PaymentStatus.PARTIALLY_REFUNDED,
            },
          });
        }

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: `REFUND_${decision}`,
          entityType: 'REFUND',
          entityId: refund.id,
          summary: `${decision} refund of ₹${refund.refundAmount} for payment ${refund.paymentId}`,
          ipAddress: req.ip,
        });

        return result;
      });

      res.json({ refund: updated });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
