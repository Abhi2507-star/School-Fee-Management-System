/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN — Core Financial Ledger & Accounting Engine
 *
 * Strictly enforces:
 *   Outstanding Balance = Total Valid Charges
 *                       - Approved Concessions & Credit Adjustments
 *                       - Valid Cleared Payments Allocated to those Charges
 *
 * Rules:
 * 1. Never stores outstanding balance as a freely editable column.
 * 2. Only valid completed CASH and UPI payments count toward cleared collections.
 * 3. Prohibits over-allocation of any charge or allocating more than the payment amount.
 * 4. Explicitly tracks unallocated remainders as StudentCredit (advance balance).
 */
import { toPaise, fromPaise, amountToIndianWords } from '../utils/money.js';

export const SUPPORTED_PAYMENT_METHODS = ['CASH', 'UPI'] as const;
export type SupportedPaymentMethod = (typeof SUPPORTED_PAYMENT_METHODS)[number];

export function validateSupportedPaymentMethod(method: unknown): {
  valid: boolean;
  normalizedMethod?: SupportedPaymentMethod;
  errorCode?: string;
  message?: string;
} {
  const upper = String(method ?? '').trim().toUpperCase();
  if (upper === 'CASH' || upper === 'UPI') {
    return { valid: true, normalizedMethod: upper };
  }
  return {
    valid: false,
    errorCode: 'UNSUPPORTED_PAYMENT_METHOD',
    message: `Payment method "${String(method ?? '')}" is not supported. Only CASH and UPI payments are accepted.`,
  };
}


export interface ChargeRecordInput {
  id: string;
  studentId: string;
  enrollmentId: string;
  feeHeadCode: string;
  feeHeadName: string;
  feePeriodCode: string;
  feePeriodLabel: string;
  dueDate: string; // YYYY-MM-DD
  originalAmount: string;
  concessionAmount: string;
  adjustmentAmount: string; // positive = debit, negative = credit
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED' | 'CANCELLED';
}

export interface AllocationRecordInput {
  id: string;
  paymentId: string;
  studentChargeId: string;
  allocatedAmount: string;
  isActive: boolean;
  paymentStatus: 'COMPLETED' | 'REVERSED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  paymentMethod: 'CASH' | 'UPI';
}

export interface ComputedChargeBalance {
  chargeId: string;
  feeHeadCode: string;
  feeHeadName: string;
  feePeriodCode: string;
  feePeriodLabel: string;
  dueDate: string;
  originalAmount: string;
  concessionAmount: string;
  adjustmentAmount: string;
  netPayableAmount: string;
  clearedPaidAmount: string;
  outstandingAmount: string;
  derivedStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED' | 'CANCELLED';
  daysOverdue: number;
}

export interface StudentLedgerSummary {
  studentId: string;
  totalGrossCharges: string;
  totalApprovedConcessions: string;
  totalNetAdjustments: string;
  totalNetPayableCharges: string;
  totalClearedCollections: string;
  totalOutstandingBalance: string;
  availableAdvanceCredit: string;
  netAccountPosition: string; // Outstanding minus advance credits
  charges: ComputedChargeBalance[];
}

export function isAllocationCountedAsCleared(
  alloc: AllocationRecordInput
): boolean {
  if (!alloc.isActive) return false;
  if (alloc.paymentStatus === 'REVERSED' || alloc.paymentStatus === 'REFUNDED') {
    return false;
  }
  if (alloc.paymentMethod !== 'CASH' && alloc.paymentMethod !== 'UPI') {
    return false;
  }
  return alloc.paymentStatus === 'COMPLETED' || alloc.paymentStatus === 'PARTIALLY_REFUNDED';
}

export function calculateStudentLedger(
  studentId: string,
  charges: ChargeRecordInput[],
  allocations: AllocationRecordInput[],
  availableAdvanceCredit: string = '0.00',
  options: { referenceDate?: string } = {}
): StudentLedgerSummary {
  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();

  let totalGrossPaise = 0;
  let totalConcessionPaise = 0;
  let totalAdjPaise = 0;
  let totalNetPayablePaise = 0;
  let totalClearedPaise = 0;
  let totalOutstandingPaise = 0;

  const computedCharges: ComputedChargeBalance[] = charges.map((charge) => {
    if (charge.status === 'CANCELLED' || charge.status === 'WAIVED') {
      return {
        chargeId: charge.id,
        feeHeadCode: charge.feeHeadCode,
        feeHeadName: charge.feeHeadName,
        feePeriodCode: charge.feePeriodCode,
        feePeriodLabel: charge.feePeriodLabel,
        dueDate: charge.dueDate,
        originalAmount: fromPaise(toPaise(charge.originalAmount)),
        concessionAmount: fromPaise(toPaise(charge.concessionAmount)),
        adjustmentAmount: fromPaise(toPaise(charge.adjustmentAmount)),
        netPayableAmount: '0.00',
        clearedPaidAmount: '0.00',
        outstandingAmount: '0.00',
        derivedStatus: charge.status,
        daysOverdue: 0,
      };
    }

    const origP = toPaise(charge.originalAmount);
    const concP = toPaise(charge.concessionAmount);
    const adjP = toPaise(charge.adjustmentAmount);
    const netPayableP = Math.max(0, origP - concP + adjP);

    const chargeAllocs = allocations.filter(
      (a) => a.studentChargeId === charge.id && a.isActive
    );

    let clearedP = 0;

    for (const alloc of chargeAllocs) {
      const allocP = toPaise(alloc.allocatedAmount);
      if (isAllocationCountedAsCleared(alloc)) {
        clearedP += allocP;
      }
    }

    const outstandingP = Math.max(0, netPayableP - clearedP);

    let derivedStatus: ComputedChargeBalance['derivedStatus'] = 'UNPAID';
    if (netPayableP === 0) {
      derivedStatus = 'WAIVED';
    } else if (outstandingP === 0) {
      derivedStatus = 'PAID';
    } else if (clearedP > 0) {
      derivedStatus = 'PARTIALLY_PAID';
    }

    const due = new Date(charge.dueDate);
    const diffMs = refDate.getTime() - due.getTime();
    const daysOverdue = outstandingP > 0 && diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;

    totalGrossPaise += origP;
    totalConcessionPaise += concP;
    totalAdjPaise += adjP;
    totalNetPayablePaise += netPayableP;
    totalClearedPaise += clearedP;
    totalOutstandingPaise += outstandingP;

    return {
      chargeId: charge.id,
      feeHeadCode: charge.feeHeadCode,
      feeHeadName: charge.feeHeadName,
      feePeriodCode: charge.feePeriodCode,
      feePeriodLabel: charge.feePeriodLabel,
      dueDate: charge.dueDate,
      originalAmount: fromPaise(origP),
      concessionAmount: fromPaise(concP),
      adjustmentAmount: fromPaise(adjP),
      netPayableAmount: fromPaise(netPayableP),
      clearedPaidAmount: fromPaise(clearedP),
      outstandingAmount: fromPaise(outstandingP),
      derivedStatus,
      daysOverdue,
    };
  });

  const advanceCreditPaise = toPaise(availableAdvanceCredit);
  const netPositionPaise = Math.max(0, totalOutstandingPaise - advanceCreditPaise);

  return {
    studentId,
    totalGrossCharges: fromPaise(totalGrossPaise),
    totalApprovedConcessions: fromPaise(totalConcessionPaise),
    totalNetAdjustments: fromPaise(totalAdjPaise),
    totalNetPayableCharges: fromPaise(totalNetPayablePaise),
    totalClearedCollections: fromPaise(totalClearedPaise),
    totalOutstandingBalance: fromPaise(totalOutstandingPaise),
    availableAdvanceCredit: fromPaise(advanceCreditPaise),
    netAccountPosition: fromPaise(netPositionPaise),
    charges: computedCharges,
  };
}

export interface RequestedAllocationInput {
  studentChargeId: string;
  allocatedAmount: string;
}

export interface ValidatedAllocationPlan {
  amountReceived: string;
  amountAllocated: string;
  advanceCreditAmount: string;
  allocations: Array<{
    studentChargeId: string;
    feeHeadName: string;
    feePeriodLabel: string;
    allocatedAmount: string;
    remainingAfterAllocation: string;
    newChargeStatus: 'PARTIALLY_PAID' | 'PAID';
  }>;
}

/**
 * Validates manual or automatic oldest-due-first payment allocations.
 * Guarantees:
 * - Payment amount > 0
 * - Every referenced charge belongs to the target student
 * - No charge is overpaid (allocated <= current charge outstanding)
 * - Total allocated <= amountReceived
 * - Unallocated remainder is explicitly captured as advanceCreditAmount
 */
export function buildAndValidateAllocationPlan(params: {
  studentId: string;
  amountReceived: string;
  ledgerCharges: ComputedChargeBalance[];
  chargeOwnershipMap: Map<string, string>; // chargeId -> studentId
  manualAllocations?: RequestedAllocationInput[];
  autoAllocateOldestFirst?: boolean;
  allowAdvanceCredit?: boolean;
}): ValidatedAllocationPlan {
  const receivedPaise = toPaise(params.amountReceived);
  if (receivedPaise <= 0) {
    throw new Error('Payment amount must be strictly positive (greater than ₹0.00).');
  }

  const allowAdvance = params.allowAdvanceCredit ?? true;
  const chargeById = new Map(params.ledgerCharges.map((c) => [c.chargeId, c]));

  const plannedAllocations: ValidatedAllocationPlan['allocations'] = [];
  let totalAllocatedPaise = 0;

  if (params.manualAllocations && params.manualAllocations.length > 0) {
    const seenCharges = new Set<string>();
    for (const req of params.manualAllocations) {
      if (seenCharges.has(req.studentChargeId)) {
        throw new Error(`Duplicate allocation entry for charge ID ${req.studentChargeId}.`);
      }
      seenCharges.add(req.studentChargeId);

      const ownerStudentId = params.chargeOwnershipMap.get(req.studentChargeId);
      if (!ownerStudentId || ownerStudentId !== params.studentId) {
        throw new Error(`Charge ${req.studentChargeId} does not belong to student ${params.studentId}.`);
      }

      const charge = chargeById.get(req.studentChargeId);
      if (!charge) {
        throw new Error(`Charge ${req.studentChargeId} not found in student's active ledger.`);
      }

      const allocPaise = toPaise(req.allocatedAmount);
      if (allocPaise <= 0) {
        throw new Error(`Allocated amount for ${charge.feeHeadName} must be greater than ₹0.00.`);
      }

      const chargeOutstandingPaise = toPaise(charge.outstandingAmount);
      if (allocPaise > chargeOutstandingPaise) {
        throw new Error(
          `Cannot overpay charge "${charge.feeHeadName} (${charge.feePeriodLabel})": outstanding is ₹${charge.outstandingAmount}, attempted allocation is ₹${fromPaise(allocPaise)}.`
        );
      }

      totalAllocatedPaise += allocPaise;
      const remPaise = chargeOutstandingPaise - allocPaise;
      plannedAllocations.push({
        studentChargeId: charge.chargeId,
        feeHeadName: charge.feeHeadName,
        feePeriodLabel: charge.feePeriodLabel,
        allocatedAmount: fromPaise(allocPaise),
        remainingAfterAllocation: fromPaise(remPaise),
        newChargeStatus: remPaise === 0 ? 'PAID' : 'PARTIALLY_PAID',
      });
    }

    if (totalAllocatedPaise > receivedPaise) {
      throw new Error(
        `Total allocated amount (₹${fromPaise(totalAllocatedPaise)}) cannot exceed payment received (₹${fromPaise(receivedPaise)}).`
      );
    }
  } else if (params.autoAllocateOldestFirst !== false) {
    // Sort unpaid/partially paid charges by dueDate ascending, then feePeriodCode
    const openCharges = [...params.ledgerCharges]
      .filter((c) => toPaise(c.outstandingAmount) > 0 && c.derivedStatus !== 'CANCELLED' && c.derivedStatus !== 'WAIVED')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.feePeriodCode.localeCompare(b.feePeriodCode));

    let remainingToAllocate = receivedPaise;
    for (const charge of openCharges) {
      if (remainingToAllocate <= 0) break;
      const outPaise = toPaise(charge.outstandingAmount);
      const allocPaise = Math.min(remainingToAllocate, outPaise);
      if (allocPaise > 0) {
        remainingToAllocate -= allocPaise;
        totalAllocatedPaise += allocPaise;
        const remAfter = outPaise - allocPaise;
        plannedAllocations.push({
          studentChargeId: charge.chargeId,
          feeHeadName: charge.feeHeadName,
          feePeriodLabel: charge.feePeriodLabel,
          allocatedAmount: fromPaise(allocPaise),
          remainingAfterAllocation: fromPaise(remAfter),
          newChargeStatus: remAfter === 0 ? 'PAID' : 'PARTIALLY_PAID',
        });
      }
    }
  }

  const advanceCreditPaise = receivedPaise - totalAllocatedPaise;
  if (advanceCreditPaise > 0 && !allowAdvance) {
    throw new Error(
      `Unallocated payment remainder of ₹${fromPaise(advanceCreditPaise)} is not permitted when advance credits are disabled.`
    );
  }

  return {
    amountReceived: fromPaise(receivedPaise),
    amountAllocated: fromPaise(totalAllocatedPaise),
    advanceCreditAmount: fromPaise(advanceCreditPaise),
    allocations: plannedAllocations,
  };
}

export function calculateConcessionAmount(
  originalChargeAmount: string,
  concessionType: 'FIXED_AMOUNT' | 'PERCENTAGE',
  concessionValue: string
): string {
  const origPaise = toPaise(originalChargeAmount);
  if (origPaise <= 0) {
    throw new Error('Original charge amount must be positive.');
  }
  if (concessionType === 'FIXED_AMOUNT') {
    const fixedPaise = toPaise(concessionValue);
    if (fixedPaise <= 0 || fixedPaise > origPaise) {
      throw new Error('Fixed concession must be positive and cannot exceed original charge.');
    }
    return fromPaise(fixedPaise);
  } else {
    const pct = Number(concessionValue);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      throw new Error('Percentage concession must be between 0.01% and 100%.');
    }
    const calcPaise = Math.round((origPaise * pct) / 100);
    return fromPaise(Math.min(origPaise, calcPaise));
  }
}

export function calculateLateFeeForCharge(params: {
  dueDate: string;
  asOfDate: string;
  outstandingAmount: string;
  ruleType: 'NONE' | 'FIXED_ONCE' | 'PER_DAY' | 'PER_MONTH';
  rateAmount: string;
  graceDays: number;
  maxCapAmount?: string | null;
}): { lateFeeAmount: string; daysLateAfterGrace: number; calculationBasis: string } {
  const outPaise = toPaise(params.outstandingAmount);
  if (outPaise <= 0 || params.ruleType === 'NONE') {
    return { lateFeeAmount: '0.00', daysLateAfterGrace: 0, calculationBasis: 'No late fee applicable' };
  }

  const due = new Date(params.dueDate);
  const asOf = new Date(params.asOfDate);
  const totalDaysLate = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (totalDaysLate <= params.graceDays) {
    return {
      lateFeeAmount: '0.00',
      daysLateAfterGrace: 0,
      calculationBasis: `Within ${params.graceDays}-day grace period`,
    };
  }

  const ratePaise = toPaise(params.rateAmount);
  let feePaise = 0;
  let basis = '';

  if (params.ruleType === 'FIXED_ONCE') {
    feePaise = ratePaise;
    basis = `Fixed one-time fine of ₹${fromPaise(ratePaise)} after ${params.graceDays} grace days (${totalDaysLate} days overdue)`;
  } else if (params.ruleType === 'PER_DAY') {
    feePaise = totalDaysLate * ratePaise;
    basis = `${totalDaysLate} days overdue × ₹${fromPaise(ratePaise)}/day`;
  } else if (params.ruleType === 'PER_MONTH') {
    const monthsLate = Math.ceil(totalDaysLate / 30);
    feePaise = monthsLate * ratePaise;
    basis = `${monthsLate} overdue month(s) × ₹${fromPaise(ratePaise)}/month`;
  }

  if (params.maxCapAmount) {
    const capPaise = toPaise(params.maxCapAmount);
    if (capPaise > 0 && feePaise > capPaise) {
      feePaise = capPaise;
      basis += ` (Capped at maximum ₹${fromPaise(capPaise)})`;
    }
  }

  return {
    lateFeeAmount: fromPaise(feePaise),
    daysLateAfterGrace: totalDaysLate - params.graceDays,
    calculationBasis: basis,
  };
}

export function formatReceiptNumber(prefix: string, academicYearCode: string, sequenceNumber: number): string {
  const cleanPrefix = (prefix || 'SVSS').trim().toUpperCase();
  const cleanYear = academicYearCode.trim();
  const paddedSeq = String(sequenceNumber).padStart(6, '0');
  return `${cleanPrefix}/${cleanYear}/${paddedSeq}`;
}

export { amountToIndianWords };
