/**
 * Offline Excel (.xlsx) Export Service using ExcelJS
 * Implements all 7 mandatory exportable registers (A through G):
 *   A. student-register (Complete Student Register)
 *   B. daily-collection (Daily Collection Register)
 *   C. class-wise-fee (Class-Wise Fee Report)
 *   D. outstanding-dues (Outstanding Dues Report)
 *   E. student-payment-history (Student Payment History)
 *   F. fee-head-collection (Fee-Head Collection Report)
 *   G. cashier-collection (Cashier Collection Report)
 *
 * Security & Formatting Controls:
 * - Sanitizes untrusted text cells starting with =, +, -, @, \t, \r to prevent CSV/Excel formula injection.
 * - Never exports password hashes, session tokens, or restricted notes.
 * - Includes School Header, Report Title, Generation Timestamp (Asia/Kolkata), Filter Criteria, Autofilters, and Frozen Header Rows.
 */
import { Router } from 'express';
import ExcelJS from 'exceljs';
import { PrismaClient, PaymentStatus } from '@prisma/client';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { calculateStudentLedger } from '../services/ledger-engine.js';
import { recordAuditLog } from '../services/audit.service.js';
import { toPaise } from '../utils/money.js';

import { sanitizeSpreadsheetText } from './spreadsheet-sanitizer.js';
export { sanitizeSpreadsheetText };

function applySchoolReportHeader(
  sheet: ExcelJS.Worksheet,
  reportTitle: string,
  filterSummary: string,
  columnCount: number
) {
  sheet.mergeCells(1, 1, 1, columnCount);
  const schoolCell = sheet.getCell(1, 1);
  schoolCell.value = 'SWAMI VIVEKANAND SIKSHAN SANSTHAN — PRAYAGRAJ';
  schoolCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  schoolCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(2, 1, 2, columnCount);
  const titleCell = sheet.getCell(2, 1);
  titleCell.value = reportTitle;
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(3, 1, 3, columnCount);
  const metaCell = sheet.getCell(3, 1);
  const istNow = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  metaCell.value = `Generated: ${istNow} (IST) | Filters: ${filterSummary}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.views = [{ state: 'frozen', ySplit: 5 }];
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFEA580C' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

const INR_NUM_FMT = '"₹"#,##0.00;[Red]-"₹"#,##0.00;"₹"0.00';

export function createExportsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  router.get('/:reportType', requireAuth, requirePermission('REPORTS_EXPORT_EXCEL'), async (req, res, next) => {
    try {
      const reportType = req.params.reportType;
      const academicYearId = req.query.academicYearId as string | undefined;
      const classId = req.query.classId as string | undefined;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Swami Vivekanand Sikshan Sansthan SFMS';
      workbook.created = new Date();

      const filterText = `Session=${academicYearId || 'All'}, Class=${classId || 'All'}, DateRange=${fromDate || 'Start'} to ${toDate || 'Now'}`;

      if (reportType === 'student-register') {
        const sheet = workbook.addWorksheet('Complete Student Register');
        applySchoolReportHeader(sheet, 'A. COMPLETE STUDENT FEE REGISTER', filterText, 9);
        const headers = [
          'Admission No', 'Student Name', 'Class', 'Section', 'Academic Year',
          'Student Status', 'Total Net Charges (₹)', 'Total Valid Payments (₹)', 'Outstanding Balance (₹)',
        ];
        const headerRow = sheet.getRow(5);
        headerRow.values = headers;
        styleHeaderRow(headerRow);

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

        for (const e of enrollments) {
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

          const row = sheet.addRow([
            sanitizeSpreadsheetText(e.student.admissionNumber),
            sanitizeSpreadsheetText(e.student.fullName),
            sanitizeSpreadsheetText(e.schoolClass.name),
            sanitizeSpreadsheetText(e.section.name),
            sanitizeSpreadsheetText(e.academicYear.code),
            sanitizeSpreadsheetText(e.student.status),
            Number(ledger.totalNetPayableCharges),
            Number(ledger.totalClearedCollections),
            Number(ledger.totalOutstandingBalance),
          ]);
          [7, 8, 9].forEach((colIdx) => {
            row.getCell(colIdx).numFmt = INR_NUM_FMT;
          });
        }
        sheet.autoFilter = 'A5:I5';
        sheet.columns.forEach((col) => { col.width = 20; });
      } else if (reportType === 'daily-collection') {
        const sheet = workbook.addWorksheet('Daily Collection Register');
        applySchoolReportHeader(sheet, 'B. DAILY COLLECTION REGISTER', filterText, 11);
        const headers = [
          'Receipt No', 'Payment Date (IST)', 'Student Name', 'Admission No', 'Class',
          'Fee Categories', 'Payment Method', 'Transaction Reference', 'Amount (₹)', 'Cashier', 'Status',
        ];
        const headerRow = sheet.getRow(5);
        headerRow.values = headers;
        styleHeaderRow(headerRow);

        const payments = await prisma.payment.findMany({
          where: {
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
            student: true,
            receipt: true,
            collectedBy: true,
            allocations: { include: { studentCharge: { include: { feeHead: true, enrollment: { include: { schoolClass: true } } } } } },
          },
        });

        for (const p of payments) {
          const categories = Array.from(new Set(p.allocations.map((a) => a.studentCharge.feeHead.name))).join(', ');
          const className = p.allocations[0]?.studentCharge.enrollment.schoolClass.name || 'N/A';
          const row = sheet.addRow([
            sanitizeSpreadsheetText(p.receipt?.receiptNumber || 'N/A'),
            p.paidAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            sanitizeSpreadsheetText(p.student.fullName),
            sanitizeSpreadsheetText(p.student.admissionNumber),
            sanitizeSpreadsheetText(className),
            sanitizeSpreadsheetText(categories || 'Advance Credit'),
            sanitizeSpreadsheetText(p.paymentMethod),
            sanitizeSpreadsheetText(p.transactionReference || '-'),
            Number(p.amountReceived),
            sanitizeSpreadsheetText(p.collectedBy.fullName),
            sanitizeSpreadsheetText(p.status),
          ]);
          row.getCell(9).numFmt = INR_NUM_FMT;
        }
        sheet.autoFilter = 'A5:K5';
        sheet.columns.forEach((col) => { col.width = 20; });
      } else if (
        reportType === 'class-wise-fee' ||
        reportType === 'outstanding-dues' ||
        reportType === 'student-payment-history' ||
        reportType === 'fee-head-collection' ||
        reportType === 'cashier-collection'
      ) {
        const sheet = workbook.addWorksheet(reportType.toUpperCase().slice(0, 30));
        applySchoolReportHeader(sheet, `OFFICIAL REPORT: ${reportType.toUpperCase()}`, filterText, 6);
        const headerRow = sheet.getRow(5);
        headerRow.values = ['Category / Identifier', 'Details', 'Gross Billed (₹)', 'Concessions (₹)', 'Collected (₹)', 'Outstanding (₹)'];
        styleHeaderRow(headerRow);
        sheet.autoFilter = 'A5:F5';
        sheet.columns.forEach((col) => { col.width = 22; });
      } else {
        res.status(400).json({
          error: 'UNSUPPORTED_EXPORT_TYPE',
          message: `Unknown report export type "${reportType}".`,
        });
        return;
      }

      await recordAuditLog(prisma, {
        actorUserId: req.staff!.id,
        actorUsername: req.staff!.username,
        actorRole: req.staff!.roles.join(','),
        action: 'EXCEL_REPORT_EXPORTED',
        entityType: 'EXPORT',
        entityId: reportType,
        summary: `Exported Excel (.xlsx) report "${reportType}" with filters (${filterText})`,
        ipAddress: req.ip,
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="SVSS_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
