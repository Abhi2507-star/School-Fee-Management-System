/**
 * Dashboard & 14 Financial/Operational Reports Module
 * Strictly separates Fees Billed (Charges) from Valid Cleared Money Collected.
 * Uses server-side aggregation and pagination.
 */
import { Router } from 'express';
import { PrismaClient, PaymentStatus, PaymentMethod } from '@prisma/client';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { calculateStudentLedger } from '../services/ledger-engine.js';
import { toPaise, fromPaise } from '../utils/money.js';

export function createReportsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  // GET /api/v1/reports/dashboard — Executive Dashboard Metrics
  router.get('/dashboard', requireAuth, requirePermission('REPORTS_VIEW_DAILY'), async (req, res, next) => {
    try {
      const academicYearId = req.query.academicYearId as string | undefined;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalActiveStudents,
        classesWithCounts,
        todayPayments,
        monthPayments,
        yearPayments,
        cashPayments,
        upiPayments,
        recentPayments,
        recentReversals,
        recentRefunds,
        allCharges,
      ] = await Promise.all([
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.schoolClass.findMany({
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: {
              select: { enrollments: { where: { status: 'ACTIVE', ...(academicYearId ? { academicYearId } : {}) } } },
            },
          },
        }),
        prisma.payment.aggregate({
          _sum: { amountReceived: true },
          where: { status: PaymentStatus.COMPLETED, paidAt: { gte: startOfToday } },
        }),
        prisma.payment.aggregate({
          _sum: { amountReceived: true },
          where: { status: PaymentStatus.COMPLETED, paidAt: { gte: startOfMonth } },
        }),
        prisma.payment.aggregate({
          _sum: { amountReceived: true },
          where: {
            status: PaymentStatus.COMPLETED,
            ...(academicYearId ? { academicYearId } : {}),
          },
        }),
        prisma.payment.aggregate({
          _sum: { amountReceived: true },
          where: {
            status: PaymentStatus.COMPLETED,
            paymentMethod: PaymentMethod.CASH,
            ...(academicYearId ? { academicYearId } : {}),
          },
        }),
        prisma.payment.aggregate({
          _sum: { amountReceived: true },
          where: {
            status: PaymentStatus.COMPLETED,
            paymentMethod: PaymentMethod.UPI,
            ...(academicYearId ? { academicYearId } : {}),
          },
        }),
        prisma.payment.findMany({
          take: 10,
          orderBy: { paidAt: 'desc' },
          include: {
            student: { select: { fullName: true, admissionNumber: true } },
            receipt: { select: { receiptNumber: true } },
            collectedBy: { select: { fullName: true } },
          },
        }),
        prisma.reversal.findMany({
          take: 5,
          orderBy: { requestedAt: 'desc' },
          include: { requestedBy: { select: { fullName: true } }, approvedBy: { select: { fullName: true } } },
        }),
        prisma.refund.findMany({
          take: 5,
          orderBy: { requestedAt: 'desc' },
          include: { requestedBy: { select: { fullName: true } }, approvedBy: { select: { fullName: true } } },
        }),
        prisma.studentCharge.findMany({
          where: {
            ...(academicYearId ? { academicYearId } : {}),
            status: { notIn: ['CANCELLED', 'WAIVED'] },
          },
          include: {
            enrollment: {
              include: {
                student: { select: { id: true, admissionNumber: true, fullName: true } },
                schoolClass: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
            paymentAllocations: {
              where: { isActive: true },
              include: { payment: true },
            },
          },
        }),
      ]);

      let totalBilledPaise = 0;
      let totalConcessionsPaise = 0;
      let totalOutstandingPaise = 0;
      let overdueInstallmentCount = 0;
      const pendingByStudent = new Map<
        string,
        {
          studentId: string;
          admissionNumber: string;
          fullName: string;
          className: string;
          sectionName: string;
          outstandingPaise: number;
        }
      >();

      for (const ch of allCharges) {
        const origP = toPaise(ch.originalAmount.toString());
        const concP = toPaise(ch.concessionAmount.toString());
        const adjP = toPaise(ch.adjustmentAmount.toString());
        const netPayableP = Math.max(0, origP - concP + adjP);
        const clearedPaidP = ch.paymentAllocations
          .filter((a) => a.payment.status === PaymentStatus.COMPLETED)
          .reduce((acc, a) => acc + toPaise(a.allocatedAmount.toString()), 0);

        const outP = Math.max(0, netPayableP - clearedPaidP);
        totalBilledPaise += origP;
        totalConcessionsPaise += concP;
        totalOutstandingPaise += outP;
        if (outP > 0 && ch.dueDate < startOfToday) {
          overdueInstallmentCount++;
        }
        if (outP > 0 && ch.enrollment?.student) {
          const st = ch.enrollment.student;
          const prev = pendingByStudent.get(st.id) || {
            studentId: st.id,
            admissionNumber: st.admissionNumber,
            fullName: st.fullName,
            className: ch.enrollment.schoolClass?.name || '',
            sectionName: ch.enrollment.section?.name || '',
            outstandingPaise: 0,
          };
          prev.outstandingPaise += outP;
          pendingByStudent.set(st.id, prev);
        }
      }

      const studentsWithPendingFees = Array.from(pendingByStudent.values())
        .sort((a, b) => b.outstandingPaise - a.outstandingPaise)
        .map((item) => ({
          studentId: item.studentId,
          admissionNumber: item.admissionNumber,
          fullName: item.fullName,
          className: item.className,
          sectionName: item.sectionName,
          outstandingAmount: fromPaise(item.outstandingPaise),
        }));

      res.json({
        metrics: {
          totalActiveStudents,
          todaysValidCollection: fromPaise(toPaise(todayPayments._sum.amountReceived?.toString() || '0.00')),
          thisMonthsValidCollection: fromPaise(toPaise(monthPayments._sum.amountReceived?.toString() || '0.00')),
          academicYearCollection: fromPaise(toPaise(yearPayments._sum.amountReceived?.toString() || '0.00')),
          totalGrossFeesBilled: fromPaise(totalBilledPaise),
          totalConcessionsGranted: fromPaise(totalConcessionsPaise),
          totalOutstandingDues: fromPaise(totalOutstandingPaise),
          overdueInstallmentsCount: overdueInstallmentCount,
          cashCollection: fromPaise(toPaise(cashPayments._sum.amountReceived?.toString() || '0.00')),
          upiCollection: fromPaise(toPaise(upiPayments._sum.amountReceived?.toString() || '0.00')),
        },
        studentsByClass: classesWithCounts.map((c) => ({
          classCode: c.code,
          className: c.name,
          studentCount: c._count.enrollments,
        })),
        recentPayments,
        studentsWithPendingFees,
        recentReversals,
        recentRefunds,
      });
    } catch (err) {
      next(err);
    }
  });

  // Report 1 & 2 & 9 & 10: Collection Register (Daily / Monthly / Payment & Receipt / Cashier-Wise)
  router.get('/collections', requireAuth, requirePermission('REPORTS_VIEW_DAILY'), async (req, res, next) => {
    try {
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const paymentMethod = req.query.paymentMethod as any;
      const cashierId = req.query.cashierId as string | undefined;

      const payments = await prisma.payment.findMany({
        where: {
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(cashierId ? { collectedById: cashierId } : {}),
          ...(fromDate || toDate
            ? {
                paidAt: {
                  ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
                  ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
                },
              }
            : {}),
        },
        orderBy: { paidAt: 'desc' },
        include: {
          student: { select: { admissionNumber: true, fullName: true } },
          receipt: { select: { receiptNumber: true, isCancelledByReversal: true } },
          collectedBy: { select: { id: true, fullName: true, username: true } },
          allocations: { include: { studentCharge: { include: { feeHead: true } } } },
        },
      });

      let validClearedPaise = 0;
      let reversedPaise = 0;
      const byCashierMap = new Map<string, { cashierName: string; count: number; cashPaise: number; nonCashPaise: number; reversedPaise: number }>();

      for (const p of payments) {
        const amtP = toPaise(p.amountReceived.toString());
        if (p.status === PaymentStatus.COMPLETED) {
          validClearedPaise += amtP;
        } else if (p.status === PaymentStatus.REVERSED) {
          reversedPaise += amtP;
        }

        const cEntry = byCashierMap.get(p.collectedById) || {
          cashierName: p.collectedBy.fullName,
          count: 0,
          cashPaise: 0,
          nonCashPaise: 0,
          reversedPaise: 0,
        };
        cEntry.count += 1;
        if (p.status === PaymentStatus.COMPLETED) {
          if (p.paymentMethod === 'CASH') cEntry.cashPaise += amtP;
          else cEntry.nonCashPaise += amtP;
        } else if (p.status === PaymentStatus.REVERSED) {
          cEntry.reversedPaise += amtP;
        }
        byCashierMap.set(p.collectedById, cEntry);
      }

      res.json({
        summary: {
          totalRecords: payments.length,
          validClearedCollection: fromPaise(validClearedPaise),
          reversedAmount: fromPaise(reversedPaise),
        },
        cashierBreakdown: Array.from(byCashierMap.values()).map((c) => ({
          cashierName: c.cashierName,
          paymentCount: c.count,
          cashCollection: fromPaise(c.cashPaise),
          nonCashCollection: fromPaise(c.nonCashPaise),
          reversals: fromPaise(c.reversedPaise),
          netCollection: fromPaise(c.cashPaise + c.nonCashPaise),
        })),
        payments,
      });
    } catch (err) {
      next(err);
    }
  });

  // Report 6 & 7: Outstanding Dues & Defaulter Report
  router.get('/outstanding', requireAuth, requirePermission('REPORTS_VIEW_ALL'), async (req, res, next) => {
    try {
      const academicYearId = req.query.academicYearId as string | undefined;
      const classId = req.query.classId as string | undefined;
      const sectionId = req.query.sectionId as string | undefined;
      const onlyOverdue = req.query.onlyOverdue === 'true';

      const charges = await prisma.studentCharge.findMany({
        where: {
          ...(academicYearId ? { academicYearId } : {}),
          status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          enrollment: {
            ...(classId ? { classId } : {}),
            ...(sectionId ? { sectionId } : {}),
          },
        },
        include: {
          feeHead: true,
          enrollment: {
            include: {
              student: true,
              schoolClass: true,
              section: true,
            },
          },
          paymentAllocations: {
            where: { isActive: true },
            include: { payment: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      const now = new Date();
      const rows = [];
      let totalOutstandingPaise = 0;

      for (const c of charges) {
        const origP = toPaise(c.originalAmount.toString());
        const concP = toPaise(c.concessionAmount.toString());
        const adjP = toPaise(c.adjustmentAmount.toString());
        const netP = Math.max(0, origP - concP + adjP);
        const paidP = c.paymentAllocations
          .filter((a) => a.payment.status === PaymentStatus.COMPLETED)
          .reduce((acc, a) => acc + toPaise(a.allocatedAmount.toString()), 0);
        const outP = Math.max(0, netP - paidP);
        if (outP <= 0) continue;

        const daysOverdue = Math.max(0, Math.floor((now.getTime() - c.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (onlyOverdue && daysOverdue <= 0) continue;

        totalOutstandingPaise += outP;
        rows.push({
          chargeId: c.id,
          studentId: c.enrollment.student.id,
          admissionNumber: c.enrollment.student.admissionNumber,
          studentName: c.enrollment.student.fullName,
          guardianName: c.enrollment.student.guardianName,
          contactNumber: c.enrollment.student.primaryContactNumber,
          className: c.enrollment.schoolClass.name,
          sectionName: c.enrollment.section.name,
          feeHeadName: c.feeHead.name,
          feePeriodLabel: c.feePeriodLabel,
          dueDate: c.dueDate.toISOString().slice(0, 10),
          originalCharge: fromPaise(origP),
          adjustmentsAndConcessions: fromPaise(concP - adjP),
          paymentsAllocated: fromPaise(paidP),
          outstandingAmount: fromPaise(outP),
          daysOverdue,
        });
      }

      res.json({
        totalOutstandingAmount: fromPaise(totalOutstandingPaise),
        count: rows.length,
        items: rows,
      });
    } catch (err) {
      next(err);
    }
  });

  // Report 3, 4, 5: Class-Wise & Fee-Head Collection Summary
  router.get('/student-register', requireAuth, requirePermission('REPORTS_VIEW_ALL'), async (req, res, next) => {
    try {
      const academicYearId = req.query.academicYearId as string | undefined;
      const classId = req.query.classId as string | undefined;

      const enrollments = await prisma.enrollment.findMany({
        where: {
          ...(academicYearId ? { academicYearId } : {}),
          ...(classId ? { classId } : {}),
        },
        include: {
          student: true,
          academicYear: true,
          schoolClass: true,
          section: true,
          studentCharges: {
            include: {
              feeHead: true,
              paymentAllocations: {
                where: { isActive: true },
                include: { payment: true },
              },
            },
          },
        },
      });

      const registerRows = enrollments.map((e) => {
        const ledger = calculateStudentLedger(
          e.studentId,
          e.studentCharges.map((c) => ({
            id: c.id,
            studentId: e.studentId,
            enrollmentId: e.id,
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
          e.studentCharges.flatMap((c) =>
            c.paymentAllocations.map((pa) => ({
              id: pa.id,
              paymentId: pa.paymentId,
              studentChargeId: pa.studentChargeId,
              allocatedAmount: pa.allocatedAmount.toString(),
              isActive: pa.isActive,
              paymentStatus: pa.payment.status,
              paymentMethod: pa.payment.paymentMethod,
            }))
          )
        );

        return {
          admissionNumber: e.student.admissionNumber,
          studentName: e.student.fullName,
          className: e.schoolClass.name,
          sectionName: e.section.name,
          academicYear: e.academicYear.code,
          status: e.student.status,
          totalCharges: ledger.totalNetPayableCharges,
          totalConcessions: ledger.totalApprovedConcessions,
          totalValidPayments: ledger.totalClearedCollections,
          outstandingBalance: ledger.totalOutstandingBalance,
        };
      });

      res.json({ count: registerRows.length, students: registerRows });
    } catch (err) {
      next(err);
    }
  });

  // Report 8: Payment History Report
  router.get('/payment-history', requireAuth, requirePermission('REPORTS_VIEW_DAILY'), async (req, res, next) => {
    try {
      const studentId = req.query.studentId as string | undefined;
      const payments = await prisma.payment.findMany({
        where: { ...(studentId ? { studentId } : {}) },
        orderBy: { paidAt: 'desc' },
        include: {
          student: { select: { admissionNumber: true, fullName: true } },
          receipt: true,
          allocations: { include: { studentCharge: { include: { feeHead: true } } } },
          collectedBy: { select: { fullName: true } },
        },
      });
      res.json({ payments });
    } catch (err) {
      next(err);
    }
  });

  // Report 13: Audit Log Report
  router.get('/audit-logs', requireAuth, requirePermission('AUDIT_LOG_VIEW'), async (req, res, next) => {
    try {
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const logs = await prisma.auditLog.findMany({
        where: {
          ...(action ? { action } : {}),
          ...(entityType ? { entityType } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      res.json({ auditLogs: logs });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
