import { describe, it, expect } from 'vitest';
import {
  reduceCashierSearchState,
  buildSessionScopedUrl,
  PaymentAttemptTracker,
  resolveAuthRouteGuard,
  hasAnyStructuredCriterion,
  filterStudentsByStructuredCriteria,
  computePaymentWorkflowSteps,
} from '../../apps/web/src/utils/workflows.js';

describe('Authentication Route Guard, Structured Student Search, 12-Step Workflow & Idempotency', () => {
  it('allows /setup only when uninitialized and redirects unauthenticated users to /login (Problem 1)', () => {
    expect(
      resolveAuthRouteGuard({ requestedPath: '/', initialSetupRequired: true, isAuthenticated: false })
    ).toEqual({ allow: false, redirectTo: '/setup' });
    expect(
      resolveAuthRouteGuard({ requestedPath: '/setup', initialSetupRequired: false, isAuthenticated: false })
    ).toEqual({ allow: false, redirectTo: '/login' });
  });

  it('supports structured student search by any single field or combination and clears stale selection on criteria change or reset', () => {
    const sampleStudents = [
      {
        id: 'st-1',
        admissionNumber: 'SVSS/2026/001',
        fullName: 'Aarav Mishra',
        guardianName: 'Shri Rajesh Mishra',
        className: 'Class 10',
        section: 'A',
        status: 'ACTIVE',
      },
      {
        id: 'st-2',
        admissionNumber: 'SVSS/2026/002',
        fullName: 'Aarav Verma',
        guardianName: 'Shri Manoj Verma',
        className: 'Class 10',
        section: 'B',
        status: 'ACTIVE',
      },
      {
        id: 'st-3',
        admissionNumber: 'SVSS/2026/003',
        fullName: 'Vihaan Tiwari',
        guardianName: 'Shri Alok Tiwari',
        className: 'LKG',
        section: 'A',
        status: 'ACTIVE',
      },
    ];

    expect(hasAnyStructuredCriterion({})).toBe(false);
    expect(hasAnyStructuredCriterion({ fatherName: 'Rajesh' })).toBe(true);

    // Single field: Father's Name only
    const byFather = filterStudentsByStructuredCriteria(sampleStudents, { fatherName: 'Manoj' });
    expect(byFather.map((s) => s.id)).toEqual(['st-2']);

    // Combination: Student Name + Class + Section
    const byCombo = filterStudentsByStructuredCriteria(sampleStudents, {
      studentName: 'Aarav',
      classValue: 'Class 10',
      sectionValue: 'A',
    });
    expect(byCombo.map((s) => s.id)).toEqual(['st-1']);

    // Consistent keyword matching across all search boxes (Name, Adm No, Father Name)
    const byAdmKeyword = filterStudentsByStructuredCriteria(sampleStudents, { studentName: '003' });
    expect(byAdmKeyword.map((s) => s.id)).toEqual(['st-3']);

    const byFatherKeyword = filterStudentsByStructuredCriteria(sampleStudents, { studentName: 'Rajesh' });
    expect(byFatherKeyword.map((s) => s.id)).toEqual(['st-1']);

    // State reducer: never auto-selects first match & clears stale selection on criteria change or reset
    const initial = { query: '', results: [], selectedStudentId: null, hasSearched: false, error: '' };
    const afterSearch = reduceCashierSearchState(initial, {
      type: 'SEARCH_SUCCEEDED',
      results: sampleStudents.slice(0, 2),
    });
    expect(afterSearch.selectedStudentId).toBeNull();

    const afterSelect = reduceCashierSearchState(afterSearch, {
      type: 'STUDENT_VERIFIED_AND_SELECTED',
      studentId: 'st-2',
    });
    expect(afterSelect.selectedStudentId).toBe('st-2');

    const afterCriteriaChange = reduceCashierSearchState(afterSelect, {
      type: 'CRITERIA_CHANGED',
      criteria: { sectionValue: 'A' },
    });
    expect(afterCriteriaChange.selectedStudentId).toBeNull();

    const afterReset = reduceCashierSearchState(afterSelect, { type: 'SEARCH_RESET' });
    expect(afterReset.selectedStudentId).toBeNull();
    expect(afterReset.results).toEqual([]);
    expect(afterReset.hasSearched).toBe(false);
  });

  it('tracks all 12 steps of the atomic payment workflow with Completed, Current, Upcoming, and Unavailable states', () => {
    const initialProgress = computePaymentWorkflowSteps({
      hasSearched: false,
      hasSelectedStudent: false,
      hasLoadedLedger: false,
      allocationMode: 'AUTO',
      selectedChargesCount: 0,
      amountReceivedPaise: 0,
      paymentMethod: 'CASH',
      transactionReference: '',
      isPreCommitConfirmed: false,
      isSubmitting: false,
      hasCommittedPayment: false,
      hasOpenedOrPrintedReceipt: false,
    });
    expect(initialProgress.steps.length).toBe(12);
    expect(initialProgress.currentStepNumber).toBe(1);
    expect(initialProgress.canSubmitPayment).toBe(false);
    expect(initialProgress.steps[0].status).toBe('CURRENT');
    expect(initialProgress.steps[9].status).toBe('UNAVAILABLE');

    const readyToCommit = computePaymentWorkflowSteps({
      hasSearched: true,
      hasSelectedStudent: true,
      hasLoadedLedger: true,
      allocationMode: 'AUTO',
      selectedChargesCount: 2,
      amountReceivedPaise: 220000,
      paymentMethod: 'CASH',
      transactionReference: '',
      isPreCommitConfirmed: true,
      isSubmitting: false,
      hasCommittedPayment: false,
      hasOpenedOrPrintedReceipt: false,
    });
    expect(readyToCommit.currentStepNumber).toBe(10);
    expect(readyToCommit.canSubmitPayment).toBe(true);
    expect(readyToCommit.steps[0].status).toBe('COMPLETED');
    expect(readyToCommit.steps[7].status).toBe('COMPLETED'); // Step 8 Allocation Preview
    expect(readyToCommit.steps[8].status).toBe('COMPLETED'); // Step 9 Cashier Safety Confirmation
    expect(readyToCommit.steps[9].status).toBe('CURRENT');   // Step 10 Atomic DB Commit
  });

  it('builds session-scoped URLs and preserves a stable idempotency key across retries (Problems 5 & 8)', () => {
    expect(buildSessionScopedUrl('/reports/dashboard', 'yr-1')).toBe('/reports/dashboard?academicYearId=yr-1');
    const tracker = new PaymentAttemptTracker('st-1', 'seed99');
    const k1 = tracker.beginSubmission();
    tracker.markNetworkUncertain();
    expect(() => tracker.beginSubmission()).toThrow(/UNCERTAIN_OUTCOME_RECONCILE_REQUIRED/);
    tracker.reconcileWithServerResult(false);
    const k2 = tracker.beginSubmission();
    expect(k2).toBe(k1);
  });
});
