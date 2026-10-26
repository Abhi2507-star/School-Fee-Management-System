import { describe, it, expect } from 'vitest';
import { calculateStudentLedger, buildAndValidateAllocationPlan } from '../../apps/api/src/services/ledger-engine.js';

describe('Payment Allocation & Concurrency Validation', () => {
  it('prevents over-allocation of a charge or allocating more than payment received', () => {
    const charges = [
      {
        id: 'ch-1',
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
    ];
    const ledger = calculateStudentLedger('st-1', charges, []);
    const ownership = new Map([['ch-1', 'st-1']]);

    expect(() =>
      buildAndValidateAllocationPlan({
        studentId: 'st-1',
        amountReceived: '3000.00',
        ledgerCharges: ledger.charges,
        chargeOwnershipMap: ownership,
        manualAllocations: [{ studentChargeId: 'ch-1', allocatedAmount: '2500.00' }],
      })
    ).toThrow(/Cannot overpay charge/);
  });
});
