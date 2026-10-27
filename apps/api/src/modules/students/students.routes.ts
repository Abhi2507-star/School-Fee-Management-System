import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, StudentStatus } from '@prisma/client';
import { createAuthMiddleware } from '../../middleware/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { calculateStudentLedger } from '../../services/ledger-engine.js';
import { toPaise } from '../../utils/money.js';

export const DUMMY_TEST_ADMISSION_NUMBERS = [
  'SVSS/2026/001',
  'SVSS/2026/002',
  'SVSS/2026/003',
  'SVSS/2026/004',
] as const;

export const createStudentSchema = z.object({
  admissionNumber: z.string().trim().min(2, 'Registration/Admission Number is required').max(50),
  fullName: z.string().trim().min(2, 'Student Name is required').max(150),
  guardianName: z.string().trim().min(2, "Father's Name is required").max(150),
  primaryContactNumber: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Valid Guardian's Mobile Number (10 digits) is required"),
  address: z.string().trim().min(3, 'Address is required').max(500),
  classId: z.string().trim().min(1, 'Class is required'),
  sectionId: z.string().trim().min(1, 'Section is required'),
  academicYearId: z.string().trim().min(1, 'Academic Session is required'),
  // Optional metadata with backward-compatible defaults
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .default('2015-01-01'),
  gender: z.string().max(30).optional(),
  guardianRelation: z.string().max(50).optional().default('Father'),
  secondaryContactNumber: z.string().max(20).optional(),
  admissionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .default(() => new Date().toISOString().slice(0, 10)),
  rollNumber: z.string().max(30).optional(),
  enrollmentType: z.enum(['NEW_ADMISSION', 'PROMOTED', 'READMISSION', 'TRANSFER_IN']).default('NEW_ADMISSION'),
  restrictedNotes: z.string().max(1000).optional(),
});

export function createStudentsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  const canViewRestrictedNotes = (roles: string[]) =>
    roles.includes('ADMINISTRATOR') || roles.includes('ACCOUNTANT');

  // Development-only utility: safely purge dummy test student records (disabled in production)
  router.delete('/dummy-records', requireAuth, requirePermission('STUDENT_WRITE'), async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          error: 'DEVELOPMENT_ONLY_ENDPOINT',
          message: 'Dummy-data cleanup utilities are disabled in production.',
        });
        return;
      }
      const result = await prisma.$transaction(async (tx) => {
        const dummyStudents = await tx.student.findMany({
          where: {
            OR: [
              { admissionNumber: { in: [...DUMMY_TEST_ADMISSION_NUMBERS] } },
              { admissionNumber: { startsWith: 'DUMMY/', mode: 'insensitive' } },
              { admissionNumber: { startsWith: 'TEST/', mode: 'insensitive' } },
            ],
          },
          select: { id: true, admissionNumber: true, fullName: true },
        });

        const studentIds = dummyStudents.map((s) => s.id);
        if (studentIds.length > 0) {
          await tx.paymentAllocation.deleteMany({ where: { studentCharge: { studentId: { in: studentIds } } } });
          await tx.refundRecord.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.paymentReversal.deleteMany({ where: { payment: { studentId: { in: studentIds } } } });
          await tx.payment.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.studentConcession.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.studentCharge.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.studentEnrollment.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.student.deleteMany({ where: { id: { in: studentIds } } });
        }

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'DUMMY_STUDENTS_PURGED',
          entityType: 'STUDENT',
          summary: `Safely removed ${dummyStudents.length} dummy test student record(s) while preserving school settings, sessions, classes, fee structures, and staff accounts.`,
          ipAddress: req.ip,
        });

        return {
          removedCount: dummyStudents.length,
          removedAdmissionNumbers: dummyStudents.map((s) => s.admissionNumber),
        };
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Search & list students with session-aware enrollment and outstanding summary
  router.get('/', requireAuth, requirePermission('STUDENT_VIEW'), async (req, res, next) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      const studentName = ((req.query.studentName as string) || '').trim();
      const fatherName = ((req.query.fatherName as string) || '').trim();
      const admissionNumber = ((req.query.admissionNumber as string) || '').trim();
      const academicYearId = (req.query.academicYearId as string) || undefined;
      const classId = ((req.query.classId as string) || '').trim() || undefined;
      const sectionId = ((req.query.sectionId as string) || '').trim() || undefined;
      const status = (req.query.status as StudentStatus) || undefined;

      const andConditions: Record<string, unknown>[] = [];
      if (status) {
        andConditions.push({ status });
      }
      if (q) {
        andConditions.push({
          OR: [
            { admissionNumber: { contains: q, mode: 'insensitive' } },
            { fullName: { contains: q, mode: 'insensitive' } },
            { guardianName: { contains: q, mode: 'insensitive' } },
            { primaryContactNumber: { contains: q } },
          ],
        });
      }
      if (studentName) {
        andConditions.push({
          OR: [
            { fullName: { contains: studentName, mode: 'insensitive' } },
            { admissionNumber: { contains: studentName, mode: 'insensitive' } },
          ],
        });
      }
      if (fatherName) {
        andConditions.push({
          guardianName: { contains: fatherName, mode: 'insensitive' },
        });
      }
      if (admissionNumber) {
        andConditions.push({
          admissionNumber: { contains: admissionNumber, mode: 'insensitive' },
        });
      }
      if (classId || sectionId) {
        andConditions.push({
          enrollments: {
            some: {
              ...(academicYearId ? { academicYearId } : {}),
              ...(classId ? { classId } : {}),
              ...(sectionId ? { sectionId } : {}),
            },
          },
        });
      }

      const students = await prisma.student.findMany({
        where: andConditions.length > 0 ? { AND: andConditions } : {},
        include: {
          enrollments: {
            where: academicYearId ? { academicYearId } : undefined,
            include: { academicYear: true, schoolClass: true, section: true },
            orderBy: { createdAt: 'desc' },
          },
          charges: {
            where: academicYearId ? { enrollment: { academicYearId } } : undefined,
            include: {
              feeHead: true,
              allocations: {
                where: { isActive: true },
                include: { payment: true },
              },
            },
          },
        },
        orderBy: { admissionNumber: 'asc' },
        take: 250,
      });

      const includeNotes = canViewRestrictedNotes(req.staff!.roles);
      const formatted = students.map((st) => {
        const ledger = calculateStudentLedger(
          st.id,
          st.charges.map((c) => ({
            id: c.id,
            studentId: c.studentId,
            enrollmentId: c.enrollmentId,
            feeHeadCode: c.feeHead.code,
            feeHeadName: c.feeHead.name,
            feePeriodCode: c.feePeriodCode,
            feePeriodLabel: c.feePeriodLabel,
            dueDate: c.dueDate.toISOString().slice(0, 10),
            originalAmount: c.originalAmount.toString(),
            concessionAmount: c.concessionAmount.toString(),
            adjustmentAmount: c.adjustmentAmount.toString(),
            status: c.status,
          })),
          st.charges.flatMap((c) =>
            c.allocations.map((a) => ({
              id: a.id,
              paymentId: a.paymentId,
              studentChargeId: a.studentChargeId,
              allocatedAmount: a.allocatedAmount.toString(),
              isActive: a.isActive,
              paymentStatus: a.payment.status as 'COMPLETED' | 'REVERSED',
              paymentMethod: a.payment.paymentMethod,
            }))
          ),
          st.advanceCreditBalance.toString()
        );

        const activeEnrollment = st.enrollments[0] || null;
        return {
          id: st.id,
          admissionNumber: st.admissionNumber,
          fullName: st.fullName,
          dateOfBirth: st.dateOfBirth.toISOString().slice(0, 10),
          guardianName: st.guardianName,
          primaryContactNumber: st.primaryContactNumber,
          address: st.address,
          status: st.status,
          advanceCreditBalance: st.advanceCreditBalance.toString(),
          restrictedNotes: includeNotes ? st.restrictedNotes : undefined,
          currentEnrollment: activeEnrollment
            ? {
                enrollmentId: activeEnrollment.id,
                academicYearId: activeEnrollment.academicYearId,
                academicYearCode: activeEnrollment.academicYear.code,
                classId: activeEnrollment.classId,
                className: activeEnrollment.schoolClass.name,
                sectionId: activeEnrollment.sectionId,
                sectionName: activeEnrollment.section.name,
                rollNumber: activeEnrollment.rollNumber,
                status: activeEnrollment.status,
              }
            : null,
          ledgerSummary: {
            totalNetPayable: ledger.totalNetPayableCharges,
            totalClearedPaid: ledger.totalClearedCollections,
            totalOutstanding: ledger.totalOutstandingBalance,
            availableforFeeSubmission: true,
          },
        };
      });

      res.json({ students: formatted });
    } catch (err) {
      next(err);
    }
  });

  // Register a new student with initial session enrollment and automatic initial fee charge generation
  router.post('/', requireAuth, requirePermission('STUDENT_WRITE'), async (req, res, next) => {
    try {
      const parsed = createStudentSchema.parse(req.body);

      const duplicate = await prisma.student.findFirst({
        where: { admissionNumber: { equals: parsed.admissionNumber, mode: 'insensitive' } },
      });
      if (duplicate) {
        res.status(409).json({
          code: 'DUPLICATE_ADMISSION_NUMBER',
          message: `A student with Registration/Admission Number "${parsed.admissionNumber}" already exists.`,
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.create({
          data: {
            admissionNumber: parsed.admissionNumber,
            fullName: parsed.fullName,
            dateOfBirth: new Date(parsed.dateOfBirth),
            gender: parsed.gender,
            guardianName: parsed.guardianName,
            guardianRelation: parsed.guardianRelation || 'Father',
            primaryContactNumber: parsed.primaryContactNumber,
            secondaryContactNumber: parsed.secondaryContactNumber,
            address: parsed.address,
            admissionDate: new Date(parsed.admissionDate),
            status: 'ACTIVE',
            restrictedNotes: parsed.restrictedNotes,
          },
        });

        const enrollment = await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            academicYearId: parsed.academicYearId,
            classId: parsed.classId,
            sectionId: parsed.sectionId,
            rollNumber: parsed.rollNumber,
            enrollmentType: parsed.enrollmentType,
            status: 'ACTIVE',
          },
          include: {
            academicYear: true,
            schoolClass: true,
            section: true,
          },
        });

        // Automatically attach initial session fee charges from the active class fee structure
        // so the newly registered student is immediately available for fee submission.
        const activeStructure = await tx.feeStructure.findFirst({
          where: {
            academicYearId: parsed.academicYearId,
            classId: parsed.classId,
            isActive: true,
          },
          orderBy: { version: 'desc' },
          include: {
            items: {
              include: { feeHead: true },
            },
          },
        });

        const createdCharges = [];
        if (activeStructure && activeStructure.items.length > 0) {
          for (const item of activeStructure.items) {
            if (toPaise(item.amount.toString()) <= 0) continue;
            const periodCode =
              item.frequency === 'MONTHLY'
                ? `${enrollment.academicYear.code}-APR`
                : `SESSION-${enrollment.academicYear.code}`;
            const periodLabel =
              item.frequency === 'MONTHLY'
                ? `April (${enrollment.academicYear.code})`
                : `Session ${enrollment.academicYear.code}`;

            const charge = await tx.studentCharge.create({
              data: {
                studentId: student.id,
                enrollmentId: enrollment.id,
                feeStructureItemId: item.id,
                feeHeadId: item.feeHeadId,
                feePeriodCode: periodCode,
                feePeriodLabel: periodLabel,
                dueDate: new Date(`${enrollment.academicYear.startDate.toISOString().slice(0, 7)}-${String(item.dueDayOfMonth || 10).padStart(2, '0')}`),
                originalAmount: item.amount.toString(),
                concessionAmount: '0.00',
                adjustmentAmount: '0.00',
                netPayableAmount: item.amount.toString(),
                paidAmount: '0.00',
                outstandingAmount: item.amount.toString(),
                status: 'UNPAID',
              },
            });
            createdCharges.push(charge);
          }
        } else {
          // Fallback: if no class fee structure has been configured yet, attach a baseline Tuition Fee charge if Tuition Fee head exists
          const tuitionHead = await tx.feeHead.findFirst({
            where: { code: 'TUITION', isActive: true },
          });
          if (tuitionHead) {
            const defaultTuition = '1500.00';
            const charge = await tx.studentCharge.create({
              data: {
                studentId: student.id,
                enrollmentId: enrollment.id,
                feeHeadId: tuitionHead.id,
                feePeriodCode: `${enrollment.academicYear.code}-APR`,
                feePeriodLabel: `April (${enrollment.academicYear.code})`,
                dueDate: new Date(),
                originalAmount: defaultTuition,
                concessionAmount: '0.00',
                adjustmentAmount: '0.00',
                netPayableAmount: defaultTuition,
                paidAmount: '0.00',
                outstandingAmount: defaultTuition,
                status: 'UNPAID',
              },
            });
            createdCharges.push(charge);
          }
        }

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'STUDENT_CREATED',
          entityType: 'STUDENT',
          entityId: student.id,
          studentId: student.id,
          summary: `Registered student ${student.fullName} (${student.admissionNumber}) in ${enrollment.schoolClass.name}-${enrollment.section.name} for session ${enrollment.academicYear.code} with ${createdCharges.length} initial fee charge(s).`,
          ipAddress: req.ip,
        });

        return { student, enrollment, createdChargesCount: createdCharges.length };
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Complete 9-Tab Student Profile & Ledger Endpoint
  router.get('/:id/profile', requireAuth, requirePermission('STUDENT_VIEW'), async (req, res, next) => {
    try {
      const studentId = req.params.id;
      const academicYearId = (req.query.academicYearId as string) || undefined;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          enrollments: {
            include: { academicYear: true, schoolClass: true, section: true },
            orderBy: { createdAt: 'desc' },
          },
          charges: {
            where: academicYearId ? { enrollment: { academicYearId } } : undefined,
            include: {
              feeHead: true,
              enrollment: { include: { academicYear: true, schoolClass: true, section: true } },
              allocations: {
                include: { payment: true },
              },
            },
            orderBy: { dueDate: 'asc' },
          },
          concessions: {
            include: { studentCharge: { include: { feeHead: true } } },
            orderBy: { createdAt: 'desc' },
          },
          payments: {
            where: academicYearId ? { academicYearId } : undefined,
            include: {
              allocations: { include: { studentCharge: { include: { feeHead: true } } } },
              reversals: true,
              refunds: true,
            },
            orderBy: { paidAt: 'desc' },
          },
          refunds: {
            orderBy: { createdAt: 'desc' },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
        },
      });

      if (!student) {
        res.status(404).json({ code: 'STUDENT_NOT_FOUND', message: 'Student record not found.' });
        return;
      }

      const ledger = calculateStudentLedger(
        student.id,
        student.charges.map((c) => ({
          id: c.id,
          studentId: c.studentId,
          enrollmentId: c.enrollmentId,
          feeHeadCode: c.feeHead.code,
          feeHeadName: c.feeHead.name,
          feePeriodCode: c.feePeriodCode,
          feePeriodLabel: c.feePeriodLabel,
          dueDate: c.dueDate.toISOString().slice(0, 10),
          originalAmount: c.originalAmount.toString(),
          concessionAmount: c.concessionAmount.toString(),
          adjustmentAmount: c.adjustmentAmount.toString(),
          status: c.status,
        })),
        student.charges.flatMap((c) =>
          c.allocations.map((a) => ({
            id: a.id,
            paymentId: a.paymentId,
            studentChargeId: a.studentChargeId,
            allocatedAmount: a.allocatedAmount.toString(),
            isActive: a.isActive,
            paymentStatus: a.payment.status as 'COMPLETED' | 'REVERSED',
            paymentMethod: a.payment.paymentMethod,
          }))
        ),
        student.advanceCreditBalance.toString()
      );

      const includeNotes = canViewRestrictedNotes(req.staff!.roles);

      res.json({
        overview: {
          id: student.id,
          admissionNumber: student.admissionNumber,
          fullName: student.fullName,
          dateOfBirth: student.dateOfBirth.toISOString().slice(0, 10),
          gender: student.gender,
          guardianName: student.guardianName,
          guardianRelation: student.guardianRelation,
          primaryContactNumber: student.primaryContactNumber,
          secondaryContactNumber: student.secondaryContactNumber,
          address: student.address,
          admissionDate: student.admissionDate.toISOString().slice(0, 10),
          status: student.status,
          advanceCreditBalance: student.advanceCreditBalance.toString(),
          restrictedNotes: includeNotes ? student.restrictedNotes : undefined,
        },
        academicHistory: student.enrollments,
        ledger,
        payments: student.payments,
        concessions: student.concessions,
        refunds: student.refunds,
        auditHistory: student.auditLogs,
      });
    } catch (err) {
      next(err);
    }
  });

  // Update student profile
  router.patch('/:id', requireAuth, requirePermission('STUDENT_WRITE'), async (req, res, next) => {
    try {
      const schema = z.object({
        admissionNumber: z.string().trim().min(2).max(50).optional(),
        fullName: z.string().trim().min(2).max(150).optional(),
        guardianName: z.string().trim().min(2).max(150).optional(),
        primaryContactNumber: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/).optional(),
        secondaryContactNumber: z.string().max(20).optional().nullable(),
        address: z.string().trim().min(3).max(500).optional(),
        status: z.enum(['ACTIVE', 'PROMOTED', 'TRANSFERRED', 'ALUMNI', 'WITHDRAWN', 'ARCHIVED']).optional(),
        restrictedNotes: z.string().max(1000).optional().nullable(),
      });
      const parsed = schema.parse(req.body);

      if (parsed.admissionNumber) {
        const dup = await prisma.student.findFirst({
          where: {
            id: { not: req.params.id },
            admissionNumber: { equals: parsed.admissionNumber, mode: 'insensitive' },
          },
        });
        if (dup) {
          res.status(409).json({
            code: 'DUPLICATE_ADMISSION_NUMBER',
            message: `Another student with Registration/Admission Number "${parsed.admissionNumber}" already exists.`,
          });
          return;
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.student.findUniqueOrThrow({ where: { id: req.params.id } });
        const after = await tx.student.update({
          where: { id: req.params.id },
          data: parsed,
        });

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'STUDENT_UPDATED',
          entityType: 'STUDENT',
          entityId: after.id,
          studentId: after.id,
          summary: `Updated profile for ${after.fullName} (${after.admissionNumber})`,
          beforeState: before,
          afterState: after,
          ipAddress: req.ip,
        });
        return after;
      });

      res.json({ student: updated });
    } catch (err) {
      next(err);
    }
  });

  // Promote student to next class & academic year without losing history
  router.post('/:id/promote', requireAuth, requirePermission('ACADEMIC_MANAGE'), async (req, res, next) => {
    try {
      const schema = z.object({
        targetAcademicYearId: z.string().uuid(),
        targetClassId: z.string().uuid(),
        targetSectionId: z.string().uuid(),
        rollNumber: z.string().max(30).optional(),
      });
      const parsed = schema.parse(req.body);

      const enrollment = await prisma.$transaction(async (tx) => {
        await tx.studentEnrollment.updateMany({
          where: { studentId: req.params.id, status: 'ACTIVE' },
          data: { status: 'PROMOTED' },
        });

        const created = await tx.studentEnrollment.create({
          data: {
            studentId: req.params.id,
            academicYearId: parsed.targetAcademicYearId,
            classId: parsed.targetClassId,
            sectionId: parsed.targetSectionId,
            rollNumber: parsed.rollNumber,
            enrollmentType: 'PROMOTED',
            status: 'ACTIVE',
          },
        });

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'STUDENT_PROMOTED',
          entityType: 'STUDENT_ENROLLMENT',
          entityId: created.id,
          studentId: req.params.id,
          summary: `Promoted student ${req.params.id} to new academic session ${parsed.targetAcademicYearId}`,
          ipAddress: req.ip,
        });
        return created;
      });

      res.status(201).json({ enrollment });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
