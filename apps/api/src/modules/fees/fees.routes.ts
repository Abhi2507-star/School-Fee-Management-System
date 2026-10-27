/**
 * Configurable Fee Engine Module
 * - Configurable Fee Heads
 * - Versioned Class/Section Fee Structures (never overwrites historical student charges)
 * - Idempotent Student Charge Generator (Monthly, Quarterly, Half-Yearly, Annual, One-Time)
 * - Concessions & Waivers (Fixed / Percentage, Maker-Checker Approval)
 */
import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, FeeFrequency, LateFeeRuleType, ConcessionType, ApprovalStatus } from '@prisma/client';
import { createAuthMiddleware } from '../../middleware/auth.middleware.js';
import { calculateConcessionAmount } from '../../services/ledger-engine.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { toPaise, fromPaise } from '../../utils/money.js';

const createFeeStructureSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional().nullable(),
  name: z.string().min(3).max(120),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  changeReason: z.string().min(5).max(300),
  items: z.array(
    z.object({
      feeHeadId: z.string().uuid(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      frequency: z.nativeEnum(FeeFrequency),
      dueDayOfMonth: z.number().int().min(1).max(28).default(10),
      lateFeeRuleType: z.nativeEnum(LateFeeRuleType).default(LateFeeRuleType.NONE),
      lateFeeAmount: z.string().default('0.00'),
      lateFeeGraceDays: z.number().int().min(0).max(60).default(5),
      lateFeeMaxCap: z.string().optional().nullable(),
      onlyForNewAdmission: z.boolean().default(false),
      onlyForTransportUsers: z.boolean().default(false),
    })
  ).min(1),
});

export function createFeesRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  // GET /api/v1/fee-heads
  router.get('/fee-heads', requireAuth, requirePermission('FEE_STRUCTURE_VIEW'), async (_req, res, next) => {
    try {
      const feeHeads = await prisma.feeHead.findMany({ orderBy: { displayOrder: 'asc' } });
      res.json({ feeHeads });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/fee-heads
  router.post('/fee-heads', requireAuth, requirePermission('FEE_STRUCTURE_MANAGE'), async (req, res, next) => {
    try {
      const schema = z.object({
        code: z.string().min(2).max(30).toUpperCase(),
        name: z.string().min(2).max(80),
        description: z.string().optional(),
        defaultFrequency: z.nativeEnum(FeeFrequency),
        isOptional: z.boolean().default(false),
        isRefundable: z.boolean().default(false),
        displayOrder: z.number().int().default(20),
      });
      const parsed = schema.parse(req.body);
      const feeHead = await prisma.feeHead.create({ data: parsed });
      res.status(201).json({ feeHead });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/fee-structures
  router.get('/fee-structures', requireAuth, requirePermission('FEE_STRUCTURE_VIEW'), async (req, res, next) => {
    try {
      const academicYearId = req.query.academicYearId as string | undefined;
      const classId = req.query.classId as string | undefined;
      const structures = await prisma.feeStructure.findMany({
        where: {
          ...(academicYearId ? { academicYearId } : {}),
          ...(classId ? { classId } : {}),
        },
        include: {
          academicYear: true,
          schoolClass: true,
          section: true,
          changedBy: { select: { fullName: true, username: true } },
          items: { include: { feeHead: true } },
        },
        orderBy: [{ schoolClass: { displayOrder: 'asc' } }, { version: 'desc' }],
      });
      res.json({ feeStructures: structures });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/fee-structures — Create or Version a Class Fee Structure
  router.post('/fee-structures', requireAuth, requirePermission('FEE_STRUCTURE_MANAGE'), async (req, res, next) => {
    try {
      const parsed = createFeeStructureSchema.parse(req.body);

      const createdStructure = await prisma.$transaction(async (tx) => {
        const existingCurrent = await tx.feeStructure.findFirst({
          where: {
            academicYearId: parsed.academicYearId,
            classId: parsed.classId,
            sectionId: parsed.sectionId ?? null,
            isCurrentVersion: true,
          },
          orderBy: { version: 'desc' },
        });

        const nextVersion = existingCurrent ? existingCurrent.version + 1 : 1;

        if (existingCurrent) {
          await tx.feeStructure.update({
            where: { id: existingCurrent.id },
            data: {
              isCurrentVersion: false,
              effectiveTo: new Date(parsed.effectiveFrom),
            },
          });
        }

        const structure = await tx.feeStructure.create({
          data: {
            academicYearId: parsed.academicYearId,
            classId: parsed.classId,
            sectionId: parsed.sectionId ?? null,
            name: parsed.name,
            version: nextVersion,
            isCurrentVersion: true,
            effectiveFrom: new Date(parsed.effectiveFrom),
            changeReason: parsed.changeReason,
            changedById: req.staff!.id,
            previousVersionId: existingCurrent?.id ?? null,
            items: {
              create: parsed.items.map((item) => ({
                feeHeadId: item.feeHeadId,
                amount: item.amount,
                frequency: item.frequency,
                dueDayOfMonth: item.dueDayOfMonth,
                lateFeeRuleType: item.lateFeeRuleType,
                lateFeeAmount: item.lateFeeAmount,
                lateFeeGraceDays: item.lateFeeGraceDays,
                lateFeeMaxCap: item.lateFeeMaxCap ?? null,
                onlyForNewAdmission: item.onlyForNewAdmission,
                onlyForTransportUsers: item.onlyForTransportUsers,
              })),
            },
          },
          include: { items: { include: { feeHead: true } } },
        });

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: nextVersion > 1 ? 'FEE_STRUCTURE_VERSIONED' : 'FEE_STRUCTURE_CREATED',
          entityType: 'FEE_STRUCTURE',
          entityId: structure.id,
          summary: `${nextVersion > 1 ? `Created v${nextVersion}` : 'Created v1'} fee structure "${structure.name}". Reason: ${parsed.changeReason}`,
          ipAddress: req.ip,
        });

        return structure;
      });

      res.status(201).json({ feeStructure: createdStructure });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/student-charges/generate — Idempotent Installment Charge Generator
  router.post('/student-charges/generate', requireAuth, requirePermission('FEE_STRUCTURE_MANAGE'), async (req, res, next) => {
    try {
      const schema = z.object({
        academicYearId: z.string().uuid(),
        classId: z.string().uuid(),
        sectionId: z.string().uuid().optional(),
        enrollmentId: z.string().uuid().optional(),
      });
      const parsed = schema.parse(req.body);

      const academicYear = await prisma.academicYear.findUniqueOrThrow({
        where: { id: parsed.academicYearId },
      });

      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          academicYearId: parsed.academicYearId,
          classId: parsed.classId,
          isCurrentVersion: true,
        },
        include: { items: { include: { feeHead: true } } },
      });

      if (!feeStructure) {
        res.status(404).json({
          error: 'FEE_STRUCTURE_NOT_FOUND',
          message: 'No active fee structure found for the selected academic year and class.',
        });
        return;
      }

      const enrollments = await prisma.enrollment.findMany({
        where: {
          academicYearId: parsed.academicYearId,
          classId: parsed.classId,
          ...(parsed.sectionId ? { sectionId: parsed.sectionId } : {}),
          ...(parsed.enrollmentId ? { id: parsed.enrollmentId } : {}),
          status: 'ACTIVE',
        },
        include: { student: true },
      });

      const startYear = academicYear.startDate.getUTCFullYear();
      const endYear = academicYear.endDate.getUTCFullYear();

      const MONTHS = [
        { month: 4, year: startYear, code: `${startYear}-04`, label: `April ${startYear}` },
        { month: 5, year: startYear, code: `${startYear}-05`, label: `May ${startYear}` },
        { month: 6, year: startYear, code: `${startYear}-06`, label: `June ${startYear}` },
        { month: 7, year: startYear, code: `${startYear}-07`, label: `July ${startYear}` },
        { month: 8, year: startYear, code: `${startYear}-08`, label: `August ${startYear}` },
        { month: 9, year: startYear, code: `${startYear}-09`, label: `September ${startYear}` },
        { month: 10, year: startYear, code: `${startYear}-10`, label: `October ${startYear}` },
        { month: 11, year: startYear, code: `${startYear}-11`, label: `November ${startYear}` },
        { month: 12, year: startYear, code: `${startYear}-12`, label: `December ${startYear}` },
        { month: 1, year: endYear, code: `${endYear}-01`, label: `January ${endYear}` },
        { month: 2, year: endYear, code: `${endYear}-02`, label: `February ${endYear}` },
        { month: 3, year: endYear, code: `${endYear}-03`, label: `March ${endYear}` },
      ];

      let createdCount = 0;
      let skippedDuplicateCount = 0;

      for (const enrollment of enrollments) {
        for (const item of feeStructure.items) {
          if (item.onlyForNewAdmission && !enrollment.isNewAdmission) continue;
          if (item.onlyForTransportUsers && !enrollment.student.usesTransport) continue;

          const periods: Array<{ code: string; label: string; dueDate: Date }> = [];
          const day = String(item.dueDayOfMonth).padStart(2, '0');

          if (item.frequency === FeeFrequency.MONTHLY) {
            for (const m of MONTHS) {
              const mm = String(m.month).padStart(2, '0');
              periods.push({
                code: m.code,
                label: m.label,
                dueDate: new Date(`${m.year}-${mm}-${day}`),
              });
            }
          } else if (item.frequency === FeeFrequency.QUARTERLY) {
            periods.push(
              { code: `Q1-${startYear}`, label: `Quarter 1 (Apr–Jun ${startYear})`, dueDate: new Date(`${startYear}-04-${day}`) },
              { code: `Q2-${startYear}`, label: `Quarter 2 (Jul–Sep ${startYear})`, dueDate: new Date(`${startYear}-07-${day}`) },
              { code: `Q3-${startYear}`, label: `Quarter 3 (Oct–Dec ${startYear})`, dueDate: new Date(`${startYear}-10-${day}`) },
              { code: `Q4-${endYear}`, label: `Quarter 4 (Jan–Mar ${endYear})`, dueDate: new Date(`${endYear}-01-${day}`) }
            );
          } else if (item.frequency === FeeFrequency.HALF_YEARLY) {
            periods.push(
              { code: `TERM1-${startYear}`, label: `Term 1 (Sep ${startYear})`, dueDate: new Date(`${startYear}-09-${day}`) },
              { code: `TERM2-${endYear}`, label: `Term 2 (Feb ${endYear})`, dueDate: new Date(`${endYear}-02-${day}`) }
            );
          } else {
            periods.push({
              code: `SESSION-${academicYear.code}`,
              label: `Session ${academicYear.code}`,
              dueDate: new Date(`${startYear}-04-${day}`),
            });
          }

          for (const p of periods) {
            const existing = await prisma.studentCharge.findUnique({
              where: {
                enrollmentId_feeHeadId_feePeriodCode: {
                  enrollmentId: enrollment.id,
                  feeHeadId: item.feeHeadId,
                  feePeriodCode: p.code,
                },
              },
            });

            if (existing) {
              skippedDuplicateCount++;
              continue;
            }

            await prisma.studentCharge.create({
              data: {
                enrollmentId: enrollment.id,
                academicYearId: parsed.academicYearId,
                feeHeadId: item.feeHeadId,
                feeStructureItemId: item.id,
                feeStructureVersion: feeStructure.version,
                feePeriodCode: p.code,
                feePeriodLabel: p.label,
                description: `${item.feeHead.name} — ${p.label}`,
                dueDate: p.dueDate,
                originalAmount: item.amount,
              },
            });
            createdCount++;
          }
        }
      }

      await recordAuditLog(prisma, {
        actorUserId: req.staff!.id,
        actorUsername: req.staff!.username,
        actorRole: req.staff!.roles.join(','),
        action: 'STUDENT_CHARGES_GENERATED',
        entityType: 'FEE_STRUCTURE',
        entityId: feeStructure.id,
        summary: `Generated ${createdCount} student charge(s) (${skippedDuplicateCount} existing skipped idempotently).`,
        ipAddress: req.ip,
      });

      res.json({
        createdCount,
        skippedDuplicateCount,
        enrollmentsProcessed: enrollments.length,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/concessions — Request Student Fee Concession
  router.post('/concessions', requireAuth, requirePermission('CONCESSION_REQUEST'), async (req, res, next) => {
    try {
      const schema = z.object({
        studentChargeId: z.string().uuid(),
        concessionType: z.nativeEnum(ConcessionType),
        concessionValue: z.string(),
        schemeName: z.string().min(3).max(100),
        reason: z.string().min(5).max(300),
      });
      const parsed = schema.parse(req.body);

      const charge = await prisma.studentCharge.findUniqueOrThrow({
        where: { id: parsed.studentChargeId },
        include: { enrollment: true },
      });

      const approvedAmount = calculateConcessionAmount(
        charge.originalAmount.toString(),
        parsed.concessionType,
        parsed.concessionValue
      );

      const concession = await prisma.concession.create({
        data: {
          studentId: charge.enrollment.studentId,
          enrollmentId: charge.enrollmentId,
          studentChargeId: charge.id,
          concessionType: parsed.concessionType,
          concessionValue: parsed.concessionValue,
          originalCharge: charge.originalAmount,
          approvedAmount,
          schemeName: parsed.schemeName,
          reason: parsed.reason,
          status: ApprovalStatus.PENDING,
          requestedById: req.staff!.id,
        },
      });

      res.status(201).json({ concession });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/concessions/:id/approve — Administrator Concession Approval
  router.post('/concessions/:id/approve', requireAuth, requirePermission('CONCESSION_APPROVE'), async (req, res, next) => {
    try {
      const { decision, reviewNotes } = z.object({
        decision: z.enum(['APPROVED', 'REJECTED']),
        reviewNotes: z.string().optional(),
      }).parse(req.body);

      const concessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await prisma.$transaction(async (tx) => {
        const conc = await tx.concession.findUniqueOrThrow({
          where: { id: concessionId },
          include: { studentCharge: true },
        });

        if (conc.status !== ApprovalStatus.PENDING) {
          throw new Error('Concession request has already been processed.');
        }

        const newStatus = decision === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        const result = await tx.concession.update({
          where: { id: conc.id },
          data: {
            status: newStatus,
            approvedById: req.staff!.id,
            reviewedAt: new Date(),
            reviewNotes,
          },
        });

        if (decision === 'APPROVED') {
          const totalConcPaise =
            toPaise(conc.studentCharge.concessionAmount.toString()) +
            toPaise(conc.approvedAmount.toString());
          const origPaise = toPaise(conc.studentCharge.originalAmount.toString());
          if (totalConcPaise > origPaise) {
            throw new Error('Total concessions cannot exceed original charge amount.');
          }
          await tx.studentCharge.update({
            where: { id: conc.studentChargeId },
            data: {
              concessionAmount: fromPaise(totalConcPaise),
              status: totalConcPaise === origPaise ? 'WAIVED' : conc.studentCharge.status,
            },
          });
        }

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: `CONCESSION_${decision}`,
          entityType: 'CONCESSION',
          entityId: conc.id,
          summary: `${decision} concession of ₹${conc.approvedAmount} on charge ${conc.studentChargeId}`,
          ipAddress: req.ip,
        });

        return result;
      });

      res.json({ concession: updated });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
