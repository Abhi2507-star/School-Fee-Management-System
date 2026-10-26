import { describe, it, expect } from 'vitest';
import {
  calculateStudentLedger,
  buildAndValidateAllocationPlan,
  calculateConcessionAmount,
  calculateLateFeeForCharge,
  formatReceiptNumber,
  amountToIndianWords,
} from '../../apps/api/src/services/ledger-engine.js';

describe('Financial Ledger & Accounting Engine', () => {
  it('calculates full, partial, and multi-month payments accurately without float drift', () => {
    const charges = [
      {
        id: 'ch-apr',
        studentId: 'st-1',
        enrollmentId: 'enr-1',
        feeHeadCode: 'TUITION',
        feeHeadName: 'Tuition Fee',
        feePeriodCode: '2026-04',
        feePeriodLabel: 'April 2026',
        dueDate: '2026-04-10',
        originalAmount: '2000.00',
        concessionAmount: '0.00',
        adjustmentAmount: '0.00',
        status: 'UNPAID' as const,
      },
      {
        id: 'ch-may',
        studentId: 'st-1',
        enrollmentId: 'enr-1',
        feeHeadCode: 'TUITION',
        feeHeadName: 'Tuition Fee',
        feePeriodCode: '2026-05',
        feePeriodLabel: 'May 2026',
        dueDate: '2026-05-10',
        originalAmount: '2000.00',
        concessionAmount: '500.00',
        adjustmentAmount: '0.00',
        status: 'UNPAID' as const,
      },
    ];

    const ledger = calculateStudentLedger('st-1', charges, []);
    expect(ledger.totalGrossCharges).toBe('4000.00');
    expect(ledger.totalApprovedConcessions).toBe('500.00');
    expect(ledger.totalNetPayableCharges).toBe('3500.00');
    expect(ledger.totalOutstandingBalance).toBe('3500.00');

    const ownership = new Map([['ch-apr', 'st-1'], ['ch-may', 'st-1']]);
    const plan = buildAndValidateAllocationPlan({
      studentId: 'st-1',
      amountReceived: '2500.00',
      ledgerCharges: ledger.charges,
      chargeOwnershipMap: ownership,
    });

    expect(plan.amountAllocated).toBe('2500.00');
    expect(plan.advanceCreditAmount).toBe('0.00');
    expect(plan.allocations[0].allocatedAmount).toBe('2000.00');
    expect(plan.allocations[0].newChargeStatus).toBe('PAID');
    expect(plan.allocations[1].allocatedAmount).toBe('500.00');
    expect(plan.allocations[1].newChargeStatus).toBe('PARTIALLY_PAID');
  });

  it('converts Indian Rupee amounts to words accurately', () => {
    expect(amountToIndianWords('2500.00')).toBe('Rupees Two Thousand Five Hundred Only');
    expect(amountToIndianWords('125450.50')).toBe('Rupees One Lakh Twenty Five Thousand Four Hundred and Fifty and Fifty Paise Only');
  });

  it('formats server-side receipt numbers deterministically', () => {
    expect(formatReceiptNumber('SVSS', '2026-27', 1)).toBe('SVSS/2026-27/000001');
    expect(formatReceiptNumber('SVSS', '2026-27', 492)).toBe('SVSS/2026-27/000492');
  });
});
