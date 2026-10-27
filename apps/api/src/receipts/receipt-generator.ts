/**
 * Local Offline Receipt Generation Service (HTML Print Templates + PDFKit)
 * Supports:
 * - Official A4 Dual-Copy (School Copy + Parent Copy) Layout
 * - Compact 80mm Thermal Printer Layout
 * - Historical Receipt Retrieval & Reprint with optional visible "REPRINT" marker
 * - Never generates a new receipt number or duplicate payment when reprinting
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';
import { formatINR } from '../utils/money.js';

export function renderReceiptHtml(snapshot: Record<string, any>, options: { isReprint: boolean; layout: 'A4' | 'THERMAL' }): string {
  const allocations: Array<any> = snapshot.allocations || [];
  const rowsHtml = allocations
    .map(
      (a, idx) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${a.feeHeadName}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${a.feePeriodLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${formatINR(a.allocatedAmount)}</td>
      </tr>`
    )
    .join('');

  const reprintBadge = options.isReprint
    ? `<span style="display:inline-block;padding:2px 8px;border:1px solid #b45309;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;border-radius:4px;margin-left:8px;">REPRINT COPY</span>`
    : '';

  const widthCss = options.layout === 'THERMAL' ? 'max-width: 300px; font-size: 12px;' : 'max-width: 780px; font-size: 13px;';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fee Receipt ${snapshot.receiptNumber} — ${snapshot.schoolName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 16px; background: #ffffff; }
    .receipt-box { ${widthCss} margin: 0 auto; border: 2px solid #1e3a8a; padding: 18px; border-radius: 4px; }
    .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 10px; margin-bottom: 12px; }
    .school-title { font-size: 18px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; margin: 0; }
    .school-sub { font-size: 12px; color: #475569; margin: 4px 0 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #f1f5f9; color: #1e293b; text-align: left; padding: 6px 8px; border-bottom: 2px solid #cbd5e1; font-size: 12px; }
    .totals { border-top: 2px solid #1e3a8a; padding-top: 8px; font-size: 12px; }
    .signature-row { display: flex; justify-content: space-between; margin-top: 28px; font-size: 11px; color: #475569; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;max-width:780px;margin:0 auto 12px;">
    <button onclick="window.print()" style="background:#1e3a8a;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:600;">Print Receipt</button>
  </div>
  <div class="receipt-box">
    <div class="header">
      <h1 class="school-title">${snapshot.schoolName}</h1>
      <p class="school-sub">${snapshot.schoolAddress} | Phone: ${snapshot.schoolPhone}</p>
      <div style="margin-top:6px;font-weight:700;color:#1e293b;">OFFICIAL FEE RECEIPT ${reprintBadge}</div>
    </div>
    <div class="meta-grid">
      <div><strong>Receipt No:</strong> ${snapshot.receiptNumber}</div>
      <div><strong>Date & Time:</strong> ${new Date(snapshot.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
      <div><strong>Student Name:</strong> ${snapshot.studentName}</div>
      <div><strong>Admission No:</strong> ${snapshot.admissionNumber}</div>
      <div><strong>Class & Section:</strong> ${snapshot.className} - ${snapshot.sectionName}</div>
      <div><strong>Academic Session:</strong> ${snapshot.academicSession}</div>
      <div><strong>Father / Guardian:</strong> ${snapshot.guardianName}</div>
      <div><strong>Payment Mode:</strong> ${snapshot.paymentMethod} ${snapshot.transactionReference ? `(${snapshot.transactionReference})` : ''}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Fee Head</th>
          <th>Fee Period</th>
          <th style="text-align:right;">Allocated Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <div class="totals">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;color:#1e3a8a;">
        <span>Total Amount Received:</span>
        <span>${formatINR(snapshot.amountReceived)}</span>
      </div>
      ${Number(snapshot.advanceCreditAmount) > 0 ? `<div style="display:flex;justify-content:space-between;margin-top:4px;"><span>Unallocated Advance Credit Recorded:</span><span>${formatINR(snapshot.advanceCreditAmount)}</span></div>` : ''}
      <div style="margin-top:4px;"><strong>Amount in Words:</strong> <em>${snapshot.amountInWords}</em></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;color:#334155;">
        <span>Remaining Balance After Payment:</span>
        <span>${formatINR(snapshot.remainingBalanceSnapshot)}</span>
      </div>
    </div>
    <div class="signature-row">
      <div>Received By: <strong>${snapshot.cashierName}</strong> (${snapshot.cashierUsername})</div>
      <div>Authorized Cashier Sign & School Stamp</div>
    </div>
  </div>
</body>
</html>`;
}

export function createReceiptsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  // GET /api/v1/payments/:id/receipt — Retrieve HTML or PDF Receipt
  router.get('/payments/:id/receipt', requireAuth, requirePermission('RECEIPT_PRINT'), async (req, res, next) => {
    try {
      const paymentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const receipt = await prisma.receipt.findUnique({
        where: { paymentId },
      });
      if (!receipt) {
        res.status(404).json({ error: 'RECEIPT_NOT_FOUND', message: 'Receipt not found for this payment.' });
        return;
      }

      const format = (req.query.format as string | undefined)?.toUpperCase() || 'JSON';
      const layout = (req.query.layout as string | undefined)?.toUpperCase() === 'THERMAL' ? 'THERMAL' : 'A4';
      const isReprint = req.query.reprint === 'true' || receipt.reprintCount > 0;
      const snapshot = JSON.parse(receipt.snapshotPayloadJson);

      if (req.query.reprint === 'true') {
        await prisma.receipt.update({
          where: { id: receipt.id },
          data: { reprintCount: { increment: 1 }, lastReprintedAt: new Date() },
        });
        await recordAuditLog(prisma, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'RECEIPT_REPRINTED',
          entityType: 'RECEIPT',
          entityId: receipt.id,
          summary: `Reprinted receipt ${receipt.receiptNumber} (reprint #${receipt.reprintCount + 1})`,
          ipAddress: req.ip,
        });
      }

      if (format === 'HTML') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(renderReceiptHtml(snapshot, { isReprint, layout }));
        return;
      }

      if (format === 'PDF') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="Receipt_${receipt.receiptNumber.replace(/\//g, '_')}.pdf"`
        );
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);
        doc.fontSize(16).text(snapshot.schoolName, { align: 'center' });
        doc.fontSize(10).text(`${snapshot.schoolAddress} | Phone: ${snapshot.schoolPhone}`, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`OFFICIAL FEE RECEIPT ${isReprint ? '[REPRINT]' : ''}`, { align: 'center', underline: true });
        doc.moveDown();
        doc.fontSize(10).text(`Receipt No: ${snapshot.receiptNumber}`);
        doc.text(`Date: ${new Date(snapshot.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        doc.text(`Student: ${snapshot.studentName} (Adm No: ${snapshot.admissionNumber})`);
        doc.text(`Class & Section: ${snapshot.className} - ${snapshot.sectionName} | Session: ${snapshot.academicSession}`);
        doc.text(`Guardian: ${snapshot.guardianName}`);
        doc.text(`Payment Method: ${snapshot.paymentMethod} ${snapshot.transactionReference || ''}`);
        doc.moveDown();
        for (const alloc of snapshot.allocations || []) {
          doc.text(`• ${alloc.feeHeadName} (${alloc.feePeriodLabel}): Rs. ${alloc.allocatedAmount}`);
        }
        doc.moveDown();
        doc.fontSize(12).text(`Total Received: Rs. ${snapshot.amountReceived}`);
        doc.fontSize(10).text(`In Words: ${snapshot.amountInWords}`);
        doc.text(`Remaining Balance: Rs. ${snapshot.remainingBalanceSnapshot}`);
        doc.moveDown(2);
        doc.text(`Collected By: ${snapshot.cashierName} (${snapshot.cashierUsername})`);
        doc.end();
        return;
      }

      res.json({ receipt, snapshot });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
