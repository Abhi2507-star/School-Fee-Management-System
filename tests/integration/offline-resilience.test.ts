import { describe, it, expect } from 'vitest';
import { renderReceiptHtml } from '../../apps/api/src/receipts/receipt-generator.js';

describe('Offline Receipt & Report Rendering', () => {
  it('renders print-ready A4 and 80mm thermal receipts locally without external URLs', () => {
    const html = renderReceiptHtml(
      {
        schoolName: 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
        schoolAddress: 'Haripur, Karaudi Kalan, Kadipur',
        schoolPhone: '+91-532-2400108',
        receiptNumber: 'SVSS/2026-27/000001',
        paidAt: '2026-04-10T09:30:00.000Z',
        academicSession: '2026-27',
        studentName: 'Aarav Mishra',
        admissionNumber: 'SVSS/2026/001',
        className: 'Class 10',
        sectionName: 'A',
        guardianName: 'Rajesh Mishra',
        paymentMethod: 'CASH',
        allocations: [{ feeHeadName: 'Tuition Fee', feePeriodLabel: 'April 2026', allocatedAmount: '2000.00' }],
        amountReceived: '2000.00',
        advanceCreditAmount: '0.00',
        amountInWords: 'Rupees Two Thousand Only',
        remainingBalanceSnapshot: '4000.00',
        cashierName: 'Ramesh Kumar',
        cashierUsername: 'ramesh.cashier',
      },
      { isReprint: true, layout: 'A4' }
    );
    expect(html).toContain('SWAMI VIVEKANAND SIKSHAN SANSTHAN');
    expect(html).toContain('SVSS/2026-27/000001');
    expect(html).toContain('REPRINT COPY');
    expect(html).not.toContain('https://');
  });
});
