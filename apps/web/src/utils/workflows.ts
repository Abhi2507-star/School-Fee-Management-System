/**
 * Shared Production Workflow Helpers for Structured Student Search & Disambiguation,
 * 12-Step Payment Workflow State Calculation, Academic Session Query Filtering,
 * Initial Setup Routing, and Payment Idempotency.
 */

export interface StudentSummaryItem {
  id: string;
  admissionNumber: string;
  fullName: string;
  guardianName: string;
  primaryContactNumber?: string;
  className?: string;
  section?: string;
  classId?: string;
  sectionId?: string;
  status: string;
}

export interface StructuredStudentSearchCriteria {
  studentName: string;
  fatherName: string;
  classValue: string;
  sectionValue: string;
  admissionNumber?: string;
}

export interface CashierSearchState {
  query: string;
  criteria?: StructuredStudentSearchCriteria;
  results: StudentSummaryItem[];
  selectedStudentId: string | null;
  hasSearched: boolean;
  error: string;
}

export const EMPTY_STRUCTURED_SEARCH_CRITERIA: StructuredStudentSearchCriteria = {
  studentName: '',
  fatherName: '',
  classValue: '',
  sectionValue: '',
  admissionNumber: '',
};

/**
 * Checks whether at least one structured search field has a non-empty value.
 */
export function hasAnyStructuredCriterion(criteria: Partial<StructuredStudentSearchCriteria>): boolean {
  return Boolean(
    (criteria.studentName && criteria.studentName.trim()) ||
      (criteria.fatherName && criteria.fatherName.trim()) ||
      (criteria.classValue && criteria.classValue.trim()) ||
      (criteria.sectionValue && criteria.sectionValue.trim()) ||
      (criteria.admissionNumber && criteria.admissionNumber.trim())
  );
}

/**
 * Filters a list of student records using any single field or any combination of
 * Student Name, Father's Name (Guardian Name), Class, Section, or Admission Number.
 */
/**
 * Returns live autocomplete student suggestions while typing keywords in Student Name / Adm No
 * or Father's Name, respecting any currently selected Class or Section filters.
 */
export function getStudentAutocompleteSuggestions<T extends StudentSummaryItem>(students: T[], field: string, keyword: string, criteria?: Partial<StructuredStudentSearchCriteria>): T[] {
  const q = (keyword || '').trim().toLowerCase();
  const classFilter = (criteria?.classValue || '').trim().toLowerCase();
  const sectionFilter = (criteria?.sectionValue || '').trim().toLowerCase();

  return students.filter((st) => {
    if (classFilter) {
      const stClass = (st.classId || st.className || '').toLowerCase();
      const stClassName = (st.className || '').toLowerCase();
      if (stClass !== classFilter && stClassName !== classFilter) return false;
    }
    if (sectionFilter) {
      const stSec = (st.sectionId || st.section || '').toLowerCase();
      const stSecName = (st.section || '').toLowerCase();
      if (stSec !== sectionFilter && stSecName !== sectionFilter) return false;
    }
    if (!q) return true;
    if (field === 'fatherName') {
      return (
        (st.guardianName || '').toLowerCase().includes(q) ||
        st.fullName.toLowerCase().includes(q) ||
        st.admissionNumber.toLowerCase().includes(q)
      );
    }
    return (
      st.fullName.toLowerCase().includes(q) ||
      st.admissionNumber.toLowerCase().includes(q) ||
      (st.guardianName || '').toLowerCase().includes(q) ||
      (st.primaryContactNumber || '').includes(q)
    );
  });
}

/**
 * Builds automatically filled StructuredStudentSearchCriteria when a user selects a suggested
 * student from the autocomplete dropdown.
 */
export function buildAutoFillCriteriaFromStudent(student: StudentSummaryItem): StructuredStudentSearchCriteria {
  return {
    studentName: student.fullName,
    fatherName: student.guardianName || '',
    classValue: student.classId || student.className || '',
    sectionValue: student.sectionId || student.section || '',
    admissionNumber: student.admissionNumber,
  };
}

export function filterStudentsByStructuredCriteria<T extends StudentSummaryItem>(
  students: T[],
  criteria: Partial<StructuredStudentSearchCriteria>
): T[] {
  const nameFilter = (criteria.studentName || '').trim().toLowerCase();
  const fatherFilter = (criteria.fatherName || '').trim().toLowerCase();
  const classFilter = (criteria.classValue || '').trim().toLowerCase();
  const sectionFilter = (criteria.sectionValue || '').trim().toLowerCase();
  const admFilter = (criteria.admissionNumber || '').trim().toLowerCase();

  return students.filter((st) => {
    if (nameFilter) {
      const admLower = st.admissionNumber.toLowerCase();
      const matchesNameOrAdmPrefix =
        st.fullName.toLowerCase().includes(nameFilter) ||
        admLower === nameFilter ||
        admLower.startsWith(nameFilter) ||
        admLower.includes(nameFilter);
      if (!matchesNameOrAdmPrefix) return false;
    }
    if (fatherFilter) {
      if (!(st.guardianName || '').toLowerCase().includes(fatherFilter)) return false;
    }
    if (admFilter) {
      const admLower = st.admissionNumber.toLowerCase();
      if (admLower !== admFilter && !admLower.startsWith(admFilter)) return false;
    }
    if (classFilter) {
      const stClass = (st.classId || st.className || '').toLowerCase();
      const stClassName = (st.className || '').toLowerCase();
      if (stClass !== classFilter && stClassName !== classFilter) return false;
    }
    if (sectionFilter) {
      const stSec = (st.sectionId || st.section || '').toLowerCase();
      const stSecName = (st.section || '').toLowerCase();
      if (stSec !== sectionFilter && stSecName !== sectionFilter) return false;
    }
    return true;
  });
}

/**
 * Cashier search must never auto-select the first result and must clear stale selections
 * when any search criterion changes, when reset is clicked, or when a search returns no matches.
 */
export function reduceCashierSearchState(
  prevState: CashierSearchState,
  event:
    | { type: 'QUERY_CHANGED'; query: string }
    | { type: 'CRITERIA_CHANGED'; criteria: Partial<StructuredStudentSearchCriteria> }
    | { type: 'SEARCH_RESET' }
    | { type: 'SEARCH_SUCCEEDED'; results: StudentSummaryItem[] }
    | { type: 'SEARCH_FAILED'; error: string }
    | { type: 'STUDENT_VERIFIED_AND_SELECTED'; studentId: string }
): CashierSearchState {
  if (event.type === 'QUERY_CHANGED') {
    return {
      ...prevState,
      query: event.query,
      // Always clear stale student selection when search text changes
      selectedStudentId: null,
      error: '',
    };
  }
  if (event.type === 'CRITERIA_CHANGED') {
    const mergedCriteria: StructuredStudentSearchCriteria = {
      ...(prevState.criteria || EMPTY_STRUCTURED_SEARCH_CRITERIA),
      ...event.criteria,
    };
    return {
      ...prevState,
      criteria: mergedCriteria,
      // Clear stale student selection whenever any structured search field changes
      selectedStudentId: null,
      error: '',
    };
  }
  if (event.type === 'SEARCH_RESET') {
    return {
      query: '',
      criteria: { ...EMPTY_STRUCTURED_SEARCH_CRITERIA },
      results: [],
      selectedStudentId: null,
      hasSearched: false,
      error: '',
    };
  }
  if (event.type === 'SEARCH_SUCCEEDED') {
    return {
      ...prevState,
      results: event.results,
      // Never auto-select results[0]; require explicit cashier selection
      selectedStudentId: null,
      hasSearched: true,
      error: '',
    };
  }
  if (event.type === 'SEARCH_FAILED') {
    return {
      ...prevState,
      results: [],
      selectedStudentId: null,
      hasSearched: true,
      error: event.error,
    };
  }
  if (event.type === 'STUDENT_VERIFIED_AND_SELECTED') {
    const match = prevState.results.find((r) => r.id === event.studentId);
    if (!match) {
      throw new Error('Cannot select a student that is not in the current verified search results.');
    }
    return {
      ...prevState,
      selectedStudentId: match.id,
    };
  }
  return prevState;
}

export type WorkflowStepStatus = 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'UNAVAILABLE';

export interface PaymentWorkflowStepDescriptor {
  stepNumber: number;
  title: string;
  shortLabel: string;
  description: string;
  status: WorkflowStepStatus;
}

export interface PaymentWorkflowProgressInput {
  hasSearched: boolean;
  hasSelectedStudent: boolean;
  hasLoadedLedger: boolean;
  allocationMode: 'AUTO' | 'MANUAL';
  selectedChargesCount: number;
  amountReceivedPaise: number;
  paymentMethod: 'CASH' | 'UPI';
  transactionReference: string;
  isPreCommitConfirmed: boolean;
  isSubmitting: boolean;
  hasCommittedPayment: boolean;
  hasOpenedOrPrintedReceipt: boolean;
}

/**
 * Computes the visual hierarchy and progress state across all 12 steps of the atomic
 * fee collection workflow without altering or renumbering the underlying business sequence.
 */
export function computePaymentWorkflowSteps(input: PaymentWorkflowProgressInput): {
  steps: PaymentWorkflowStepDescriptor[];
  currentStepNumber: number;
  currentStepTitle: string;
  currentStepInstruction: string;
  canSubmitPayment: boolean;
  validationHint: string;
} {
  const step4Valid = input.allocationMode === 'AUTO' || input.selectedChargesCount > 0;
  const step5Valid = input.amountReceivedPaise > 0;
  const step7Valid = input.paymentMethod === 'CASH' || input.paymentMethod === 'UPI';

  let currentStepNumber = 1;
  let validationHint = '';

  if (input.hasCommittedPayment) {
    currentStepNumber = 12;
  } else if (input.isSubmitting) {
    currentStepNumber = 10;
  } else if (!input.hasSearched && !input.hasSelectedStudent) {
    currentStepNumber = 1;
    validationHint = 'Enter Student Name, Father\'s Name, Class, or Section and click Search.';
  } else if (!input.hasSelectedStudent) {
    currentStepNumber = 2;
    validationHint = 'Select and verify the intended student row from the matching search results.';
  } else if (!input.hasLoadedLedger) {
    currentStepNumber = 3;
    validationHint = 'Loading student ledger charges and concessions...';
  } else if (!step4Valid) {
    currentStepNumber = 4;
    validationHint = 'Check at least one unpaid installment for Manual Allocation, or switch to Automatic Oldest-Due-First.';
  } else if (!step5Valid) {
    currentStepNumber = 5;
    validationHint = 'Enter a positive Amount Received (₹) to calculate the installment allocation preview.';
  } else if (!step7Valid) {
    currentStepNumber = 7;
    validationHint = 'Select a supported payment method (CASH or UPI).';
  } else if (!input.isPreCommitConfirmed) {
    currentStepNumber = 9;
    validationHint = 'Review the student confirmation card and allocation preview, then check the cashier verification box to enable commit.';
  } else {
    currentStepNumber = 10;
    validationHint = 'Ready to commit payment atomically to the local database.';
  }

  const rawDefinitions: Array<{ stepNumber: number; title: string; shortLabel: string; description: string }> = [
    {
      stepNumber: 1,
      title: 'Search Student',
      shortLabel: 'Search',
      description: 'Filter by Student Name, Father\'s Name, Class, or Section.',
    },
    {
      stepNumber: 2,
      title: 'Select & Verify Student',
      shortLabel: 'Verify Student',
      description: 'Explicitly select the matching student after verifying Admission No and Father\'s Name.',
    },
    {
      stepNumber: 3,
      title: 'Load Student Fee Ledger',
      shortLabel: 'Load Ledger',
      description: 'Inspect session installments, concessions, cleared payments, and net outstanding dues.',
    },
    {
      stepNumber: 4,
      title: 'Choose Allocation Policy & Charges',
      shortLabel: 'Allocation Policy',
      description: 'Select Automatic Oldest-Due-First or manually check specific unpaid installments.',
    },
    {
      stepNumber: 5,
      title: 'Enter Amount Received (₹)',
      shortLabel: 'Enter Amount',
      description: 'Input the exact amount being collected in Indian Rupees.',
    },
    {
      stepNumber: 6,
      title: 'Select Payment Method',
      shortLabel: 'Payment Mode',
      description: 'Choose Cash or UPI.',
    },
    {
      stepNumber: 7,
      title: 'Enter Transaction Reference',
      shortLabel: 'Reference',
      description: 'Record optional UPI reference or counter note.',
    },
    {
      stepNumber: 8,
      title: 'Pre-Commit Allocation Summary',
      shortLabel: 'Allocation Preview',
      description: 'Verify exact installment breakdown (Full/Partial) and any unallocated advance credit.',
    },
    {
      stepNumber: 9,
      title: 'Cashier Safety Confirmation',
      shortLabel: 'Confirm Details',
      description: 'Confirm Student Identity, Admission No, Selected Charges, and Collection Amount.',
    },
    {
      stepNumber: 10,
      title: 'Atomic Database Commit',
      shortLabel: 'Commit DB',
      description: 'Commit payment and allocations inside a row-locked, idempotent transaction.',
    },
    {
      stepNumber: 11,
      title: 'Issue Official Numbered Receipt',
      shortLabel: 'Issue Receipt',
      description: 'Generate immutable sequential receipt (SVSS/YYYY-YY/NNNNNN).',
    },
    {
      stepNumber: 12,
      title: 'Print / Save PDF Receipt',
      shortLabel: 'Print / PDF',
      description: 'Print A4 or 80mm thermal receipt (isolated from committed payment state).',
    },
  ];

  const steps: PaymentWorkflowStepDescriptor[] = rawDefinitions.map((def) => {
    let status: WorkflowStepStatus = 'UPCOMING';

    if (input.hasCommittedPayment) {
      if (def.stepNumber < 12) {
        status = 'COMPLETED';
      } else {
        status = input.hasOpenedOrPrintedReceipt ? 'COMPLETED' : 'CURRENT';
      }
    } else if (!input.hasSelectedStudent) {
      if (def.stepNumber === 1) {
        status = input.hasSearched ? 'COMPLETED' : 'CURRENT';
      } else if (def.stepNumber === 2) {
        status = input.hasSearched ? 'CURRENT' : 'UPCOMING';
      } else {
        status = 'UNAVAILABLE';
      }
    } else {
      // Student is selected & verified (Steps 1, 2, 3 are completed once ledger is loaded)
      if (def.stepNumber <= 3) {
        status = input.hasLoadedLedger ? 'COMPLETED' : def.stepNumber < 3 ? 'COMPLETED' : 'CURRENT';
      } else if (def.stepNumber === 4) {
        status = step4Valid ? 'COMPLETED' : 'CURRENT';
      } else if (def.stepNumber === 5) {
        if (!step4Valid) status = 'UPCOMING';
        else status = step5Valid ? 'COMPLETED' : 'CURRENT';
      } else if (def.stepNumber === 6) {
        if (!step4Valid || !step5Valid) status = 'UPCOMING';
        else status = 'COMPLETED';
      } else if (def.stepNumber === 7) {
        if (!step4Valid || !step5Valid) status = 'UPCOMING';
        else status = step7Valid ? 'COMPLETED' : 'CURRENT';
      } else if (def.stepNumber === 8) {
        if (!step4Valid || !step5Valid) status = 'UNAVAILABLE';
        else status = 'COMPLETED';
      } else if (def.stepNumber === 9) {
        if (!step4Valid || !step5Valid || !step7Valid) status = 'UNAVAILABLE';
        else status = input.isPreCommitConfirmed ? 'COMPLETED' : 'CURRENT';
      } else if (def.stepNumber === 10) {
        if (!step4Valid || !step5Valid || !step7Valid || !input.isPreCommitConfirmed) {
          status = 'UNAVAILABLE';
        } else {
          status = 'CURRENT';
        }
      } else {
        status = 'UNAVAILABLE';
      }
    }

    return {
      ...def,
      status,
    };
  });

  const activeStepObj = steps.find((s) => s.stepNumber === currentStepNumber) || steps[0];
  const canSubmitPayment = Boolean(
    input.hasSelectedStudent &&
      input.hasLoadedLedger &&
      step4Valid &&
      step5Valid &&
      step7Valid &&
      input.isPreCommitConfirmed &&
      !input.isSubmitting &&
      !input.hasCommittedPayment
  );

  return {
    steps,
    currentStepNumber,
    currentStepTitle: activeStepObj.title,
    currentStepInstruction: validationHint || activeStepObj.description,
    canSubmitPayment,
    validationHint,
  };
}

/**
 * Problem 5: Builds session-scoped API query parameters and dynamic labels.
 */
export function buildSessionScopedUrl(
  basePath: string,
  selectedAcademicYearId: string,
  extraParams: Record<string, string | undefined> = {}
): string {
  const params = new URLSearchParams();
  if (selectedAcademicYearId) {
    params.set('academicYearId', selectedAcademicYearId);
  }
  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== undefined && v !== '') {
      params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Problem 8: Manages a stable payment attempt idempotency key that is reused across retries
 * of the same attempt and blocks rotating the key while an outcome is uncertain.
 */
export class PaymentAttemptTracker {
  private studentId: string;
  private idempotencyKey: string;
  private isSubmitting = false;
  private uncertainOutcome = false;
  private committedReceiptNumber: string | null = null;

  constructor(studentId: string, customSeed?: string) {
    if (!studentId) throw new Error('Student ID is required to initialize a payment attempt.');
    this.studentId = studentId;
    const suffix = customSeed || Math.random().toString(36).slice(2, 10);
    this.idempotencyKey = `pay_${studentId}_${suffix}`;
  }

  getKey(): string {
    return this.idempotencyKey;
  }

  isLockedForSubmission(): boolean {
    return this.isSubmitting || this.uncertainOutcome || this.committedReceiptNumber !== null;
  }

  beginSubmission(): string {
    if (this.isSubmitting) {
      throw new Error('DOUBLE_SUBMIT_BLOCKED: Payment submission is already in progress.');
    }
    if (this.uncertainOutcome) {
      throw new Error('UNCERTAIN_OUTCOME_RECONCILE_REQUIRED: Reconcile transaction status with server before retrying.');
    }
    if (this.committedReceiptNumber) {
      throw new Error(`ALREADY_COMMITTED: Payment already succeeded with receipt ${this.committedReceiptNumber}.`);
    }
    this.isSubmitting = true;
    // Returns the exact same idempotencyKey on retry after a non-uncertain validation fix
    return this.idempotencyKey;
  }

  markCommitted(receiptNumber: string): void {
    this.isSubmitting = false;
    this.uncertainOutcome = false;
    this.committedReceiptNumber = receiptNumber;
  }

  markNetworkUncertain(): void {
    this.isSubmitting = false;
    this.uncertainOutcome = true;
  }

  markValidationFailed(): void {
    this.isSubmitting = false;
  }

  reconcileWithServerResult(serverFound: boolean, receiptNumber?: string): { status: 'COMMITTED' | 'SAFE_TO_RETRY'; key: string } {
    this.uncertainOutcome = false;
    if (serverFound && receiptNumber) {
      this.committedReceiptNumber = receiptNumber;
      return { status: 'COMMITTED', key: this.idempotencyKey };
    }
    return { status: 'SAFE_TO_RETRY', key: this.idempotencyKey };
  }
}

/**
 * Problem 1: Determines route redirection based on initialization and auth state.
 */
export function resolveAuthRouteGuard(params: {
  requestedPath: string;
  initialSetupRequired: boolean;
  isAuthenticated: boolean;
}): { allow: boolean; redirectTo?: string } {
  if (params.initialSetupRequired) {
    if (params.requestedPath === '/setup') {
      return { allow: true };
    }
    return { allow: false, redirectTo: '/setup' };
  }

  // System is already initialized: /setup must NEVER be accessible
  if (params.requestedPath === '/setup') {
    return { allow: false, redirectTo: params.isAuthenticated ? '/' : '/login' };
  }

  if (params.requestedPath === '/login') {
    if (params.isAuthenticated) {
      return { allow: false, redirectTo: '/' };
    }
    return { allow: true };
  }

  if (!params.isAuthenticated) {
    return { allow: false, redirectTo: '/login' };
  }

  return { allow: true };
}


// ============================================================================
// HINDI-FIRST (hi) & ENGLISH (en) LOCALIZATION DICTIONARY & HELPERS
// ============================================================================

export const DEFAULT_APP_LANGUAGE = 'hi';

export const HINDI_FIRST_LABELS = {
  hi: {
    dashboard: 'मुख्य पृष्ठ',
    findStudent: 'विद्यार्थी खोजें',
    feeCollection: 'फीस जमा करें',
    reprintReceipt: 'रसीद दोबारा निकालें',
    reports: 'रिपोर्ट देखें',
    studentName: 'विद्यार्थी का नाम',
    admissionNumber: 'प्रवेश संख्या',
    fatherName: 'पिता का नाम',
    classLabel: 'कक्षा',
    sectionLabel: 'सेक्शन',
    outstandingFees: 'बाकी फीस',
    amountToPay: 'जमा की जाने वाली राशि',
    paymentMethod: 'भुगतान का तरीका',
    confirmPayment: 'भुगतान की पुष्टि करें',
    printReceipt: 'रसीद प्रिंट करें',
    reset: 'साफ करें',
    search: 'खोजें',
    cancel: 'रद्द करें',
    back: 'वापस जाएँ',
    loading: 'कृपया प्रतीक्षा करें',
    noResults: 'कोई विद्यार्थी नहीं मिला',
    // 4-Stage Fee Collection Labels
    stage1: 'विद्यार्थी खोजें',
    stage2: 'फीस देखें',
    stage3: 'भुगतान दर्ज करें',
    stage4: 'रसीद प्राप्त करें',
    // Administrative Sections
    adminHeading: 'प्रशासनिक अनुभाग',
    studentManagement: 'विद्यार्थी प्रबंधन',
    feeStructureAndCharges: 'फीस संरचना और शुल्क निर्धारण',
    concessionsAndAdjustments: 'छूट और समायोजन',
    reversalsAndRefunds: 'भुगतान रिवर्सल और रिफंड',
    approvals: 'अनुमोदन',
    staffAndPermissions: 'स्टाफ और अनुमतियाँ',
    reportsAndExcel: 'रिपोर्ट और Excel निर्यात',
    auditLog: 'ऑडिट लॉग',
    backupAndRecovery: 'बैकअप और डेटा रिकवरी',
    systemSettings: 'सिस्टम सेटिंग्स',
    // Validation & Safeguard Messages
    emptySearchError: 'कृपया खोजने के लिए कम से कम एक जानकारी (विद्यार्थी का नाम, प्रवेश संख्या, पिता का नाम, कक्षा या सेक्शन) दर्ज करें।',
    emptyReceiptSearchError: 'कृपया रसीद खोजने के लिए रसीद संख्या, प्रवेश संख्या, या विद्यार्थी का नाम दर्ज करें।',
    invalidAmountError: 'कृपया सही राशि दर्ज करें (राशि ₹0 से अधिक होनी चाहिए)।',
    confirmBeforeCommitError: 'भुगतान दर्ज करने से पहले कृपया विद्यार्थी और राशि की पुष्टि करें।',
    printFailureCommittedNotice: 'भुगतान सफलतापूर्वक दर्ज हो गया है, लेकिन प्रिंट नहीं हो सका। दोबारा भुगतान न करें—नीचे दिए गए बटन से वही रसीद दोबारा प्रिंट करें।',
  },
  en: {
    dashboard: 'Dashboard',
    findStudent: 'Find Student',
    feeCollection: 'Fee Collection',
    reprintReceipt: 'Reprint Receipt',
    reports: 'Reports',
    studentName: 'Student Name',
    admissionNumber: 'Admission Number',
    fatherName: "Father's Name",
    classLabel: 'Class',
    sectionLabel: 'Section',
    outstandingFees: 'Outstanding Fees',
    amountToPay: 'Amount to Pay',
    paymentMethod: 'Payment Method',
    confirmPayment: 'Confirm Payment',
    printReceipt: 'Print Receipt',
    reset: 'Reset',
    search: 'Search',
    cancel: 'Cancel',
    back: 'Back',
    loading: 'Loading...',
    noResults: 'No Results Found',
    stage1: 'Find Student',
    stage2: 'Review Fees',
    stage3: 'Enter Payment',
    stage4: 'Get Receipt',
    adminHeading: 'Administrative Sections',
    studentManagement: 'Student Management',
    feeStructureAndCharges: 'Fee Structure & Charge Generation',
    concessionsAndAdjustments: 'Concessions & Adjustments',
    reversalsAndRefunds: 'Payment Reversals & Refunds',
    approvals: 'Approvals',
    staffAndPermissions: 'Staff & Permissions',
    reportsAndExcel: 'Reports & Excel Exports',
    auditLog: 'Audit Log',
    backupAndRecovery: 'Backup & Data Recovery',
    systemSettings: 'System Settings',
    emptySearchError: "Please enter at least one search criterion (Student Name, Admission Number, Father's Name, Class, or Section).",
    emptyReceiptSearchError: 'Please enter a Receipt Number, Admission Number, or Student Name to search.',
    invalidAmountError: 'Please enter a valid payment amount greater than ₹0.',
    confirmBeforeCommitError: 'Please verify the student and check the confirmation box before committing payment.',
    printFailureCommittedNotice: 'Payment was recorded in the database, but printing failed. Do not collect payment again—use Reprint Receipt to print the same receipt.',
  },
};

export function getLocalizedLabel(lang: string, key: string): string {
  const dict = lang === 'en' ? HINDI_FIRST_LABELS.en : HINDI_FIRST_LABELS.hi;
  return (dict as Record<string, string>)[key] || (HINDI_FIRST_LABELS.hi as Record<string, string>)[key] || key;
}

export function formatRoleLabel(roleCode: string, lang: string = 'en'): string {
  const upper = (roleCode || '').trim().toUpperCase();
  if (upper === 'ADMINISTRATOR' || upper === 'ADMIN') {
    return lang === 'hi' ? 'प्रशासक' : 'Admin';
  }
  if (upper === 'CASHIER' || upper === 'FEE_COLLECTOR' || upper === 'ACCOUNTANT' || upper === 'AUDITOR') {
    return lang === 'hi' ? 'शुल्क संग्रहकर्ता' : 'Fee Collector';
  }
  return lang === 'hi' ? 'शुल्क संग्रहकर्ता' : 'Fee Collector';
}

export function resolveTwoRoleMode(roles: string[]): 'ADMIN' | 'FEE_COLLECTOR' {
  const normalized = (roles || []).map((r) => String(r || '').trim().toUpperCase());
  if (normalized.includes('ADMINISTRATOR') || normalized.includes('ADMIN')) {
    return 'ADMIN';
  }
  return 'FEE_COLLECTOR';
}

export function resolveRoleRouteAccess(requestedPath: string, roles: string[]) {
  const mode = resolveTwoRoleMode(roles);
  if (mode === 'ADMIN') {
    return {
      allowed: true,
      roleMode: 'ADMIN',
      dashboardType: 'ADMIN_DASHBOARD',
    };
  }

  const rawPath = (requestedPath || '/').trim();
  const [pathname, queryString = ''] = rawPath.split('?');
  const lowerPath = pathname.toLowerCase();
  const lowerQuery = queryString.toLowerCase();

  const restrictedAdminPrefixes = ['/fee-structures', '/approvals', '/admin'];
  const isRestrictedPrefix = restrictedAdminPrefixes.some(
    (prefix) => lowerPath === prefix || lowerPath.startsWith(prefix + '/')
  );
  const isRestrictedQuery =
    lowerQuery.includes('mode=manage') || lowerQuery.includes('tab=exports');

  if (isRestrictedPrefix || isRestrictedQuery) {
    return {
      allowed: false,
      roleMode: 'FEE_COLLECTOR',
      dashboardType: 'FEE_COLLECTOR_DASHBOARD',
      redirectTo: '/',
      reasonHi: 'अनुमति नहीं है: यह प्रशासनिक पृष्ठ केवल Admin के लिए है।',
      reasonEn: 'Access Denied: This administrative page is restricted to Admin.',
    };
  }

  return {
    allowed: true,
    roleMode: 'FEE_COLLECTOR',
    dashboardType: 'FEE_COLLECTOR_DASHBOARD',
  };
}

export function getPermittedReportsForRole(roles: string[]) {
  const mode = resolveTwoRoleMode(roles);
  if (mode === 'ADMIN') {
    return {
      roleMode: 'ADMIN',
      canExportExcel: true,
      allowedReportIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
    };
  }
  return {
    roleMode: 'FEE_COLLECTOR',
    canExportExcel: false,
    allowedReportIds: ['1', '2', '9', '10'],
  };
}

export function computeFourStageFeeWorkflow(input: PaymentWorkflowProgressInput) {
  const underlying = computePaymentWorkflowSteps(input);
  let activeStageNumber = 1;
  if (input.hasCommittedPayment) {
    activeStageNumber = 4;
  } else if (!input.hasSelectedStudent) {
    activeStageNumber = 1;
  } else if (input.amountReceivedPaise <= 0) {
    activeStageNumber = 2;
  } else {
    activeStageNumber = 3;
  }

  const stages = [
    {
      stageNumber: 1,
      labelHi: HINDI_FIRST_LABELS.hi.stage1,
      labelEn: HINDI_FIRST_LABELS.en.stage1,
      status: activeStageNumber > 1 ? 'COMPLETED' : activeStageNumber === 1 ? 'CURRENT' : 'UPCOMING',
    },
    {
      stageNumber: 2,
      labelHi: HINDI_FIRST_LABELS.hi.stage2,
      labelEn: HINDI_FIRST_LABELS.en.stage2,
      status: activeStageNumber > 2 ? 'COMPLETED' : activeStageNumber === 2 ? 'CURRENT' : 'UPCOMING',
    },
    {
      stageNumber: 3,
      labelHi: HINDI_FIRST_LABELS.hi.stage3,
      labelEn: HINDI_FIRST_LABELS.en.stage3,
      status: activeStageNumber > 3 ? 'COMPLETED' : activeStageNumber === 3 ? 'CURRENT' : 'UPCOMING',
    },
    {
      stageNumber: 4,
      labelHi: HINDI_FIRST_LABELS.hi.stage4,
      labelEn: HINDI_FIRST_LABELS.en.stage4,
      status: input.hasCommittedPayment ? 'COMPLETED' : activeStageNumber === 4 ? 'CURRENT' : 'UPCOMING',
    },
  ];

  return {
    activeStageNumber,
    stages,
    canSubmitPayment: underlying.canSubmitPayment,
    underlyingStepNumber: underlying.currentStepNumber,
    validationHint: underlying.validationHint,
  };
}

export function createEmptyUncommittedPaymentState() {
  return {
    selectedStudentId: null,
    amountReceived: '',
    paymentMethod: 'CASH',
    allocationMode: 'AUTO',
    selectedChargeIds: [],
    transactionReference: '',
    isPreCommitConfirmed: false,
    attemptIdempotencyKey: '',
    uncertainOutcome: false,
    errorMsg: '',
    receiptPrintError: '',
  };
}

// ============================================================================
// 8-FIELD STUDENT REGISTRATION, CONFIGURABLE SESSIONS & SAFE DUMMY CLEANUP
// ============================================================================

export interface EightFieldStudentRegistrationInput {
  admissionNumber: string;
  fullName: string;
  guardianName: string;
  primaryContactNumber: string;
  address: string;
  classValue: string;
  sectionValue: string;
  academicSession: string;
}

export interface ConfigurableAcademicSession {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export const REQUIRED_STUDENT_REGISTRATION_FIELDS = [
  'admissionNumber',
  'fullName',
  'guardianName',
  'primaryContactNumber',
  'address',
  'classValue',
  'sectionValue',
  'academicSession',
] as const;

export const DUMMY_STUDENT_ADMISSION_NUMBERS = [
  'SVSS/2026/001',
  'SVSS/2026/002',
  'SVSS/2026/003',
  'SVSS/2026/004',
] as const;

/**
 * Validates the 8 required Student Registration fields and prevents duplicate
 * Registration / Admission Numbers (case-insensitive).
 */
export function validateStudentRegistrationInput(
  input: any,
  existingStudents: any = [],
  editingStudentId?: string
) {
  const admissionNumber = String(input?.admissionNumber || '').trim();
  const fullName = String(input?.fullName || '').trim();
  const guardianName = String(input?.guardianName || '').trim();
  const primaryContactNumber = String(input?.primaryContactNumber || '').trim();
  const address = String(input?.address || '').trim();
  const classValue = String(input?.classValue || '').trim();
  const sectionValue = String(input?.sectionValue || '').trim();
  const academicSession = String(input?.academicSession || '').trim();

  const requiredChecks = [
    { key: 'admissionNumber', val: admissionNumber, labelHi: 'प्रवेश / पंजीकरण संख्या', labelEn: 'Registration/Admission Number' },
    { key: 'fullName', val: fullName, labelHi: 'विद्यार्थी का नाम', labelEn: 'Student Name' },
    { key: 'guardianName', val: guardianName, labelHi: 'पिता का नाम', labelEn: "Father's Name" },
    { key: 'primaryContactNumber', val: primaryContactNumber, labelHi: 'अभिभावक का मोबाइल नंबर', labelEn: "Guardian's Mobile Number" },
    { key: 'address', val: address, labelHi: 'पता', labelEn: 'Address' },
    { key: 'classValue', val: classValue, labelHi: 'कक्षा', labelEn: 'Class' },
    { key: 'sectionValue', val: sectionValue, labelHi: 'सेक्शन', labelEn: 'Section' },
    { key: 'academicSession', val: academicSession, labelHi: 'शैक्षणिक सत्र', labelEn: 'Academic Session' },
  ];

  for (const chk of requiredChecks) {
    if (!chk.val) {
      return {
        valid: false,
        errorCode: 'MISSING_REQUIRED_FIELD',
        field: chk.key,
        messageHi: `कृपया ${chk.labelHi} दर्ज करें।`,
        messageEn: `${chk.labelEn} is required.`,
      };
    }
  }

  const digitsOnly = primaryContactNumber.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      valid: false,
      errorCode: 'INVALID_MOBILE_NUMBER',
      field: 'primaryContactNumber',
      messageHi: 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।',
      messageEn: "Please enter a valid 10-digit Guardian's Mobile Number.",
    };
  }

  const dup = (existingStudents || []).find(
    (s: any) =>
      (!editingStudentId || s.id !== editingStudentId) &&
      String(s.admissionNumber || '').trim().toLowerCase() === admissionNumber.toLowerCase()
  );
  if (dup) {
    return {
      valid: false,
      errorCode: 'DUPLICATE_ADMISSION_NUMBER',
      field: 'admissionNumber',
      messageHi: `प्रवेश / पंजीकरण संख्या "${admissionNumber}" पहले से दर्ज है। डुप्लीकेट पंजीकरण संख्या मान्य नहीं है।`,
      messageEn: `Registration/Admission Number "${admissionNumber}" already exists. Duplicate registration numbers are not allowed.`,
    };
  }

  return {
    valid: true,
    normalized: {
      admissionNumber,
      fullName,
      guardianName,
      primaryContactNumber,
      address,
      classValue,
      sectionValue,
      academicSession,
    },
  };
}

/**
 * Adds or updates a configurable Academic Session without hardcoding session lists.
 */
export function addConfigurableAcademicSession(sessions: any, newSession: any) {
  const code = String(newSession?.code || '').trim();
  if (!/^\d{4}-\d{2}$/.test(code)) {
    throw new Error('INVALID_ACADEMIC_SESSION_CODE: Academic session code must match YYYY-YY (e.g., 2027-28).');
  }
  if ((sessions || []).some((s: any) => String(s.code).toLowerCase() === code.toLowerCase())) {
    throw new Error(`DUPLICATE_ACADEMIC_SESSION: Academic session "${code}" already exists.`);
  }
  const startYear = Number(code.slice(0, 4));
  const endYear = startYear + 1;
  const entry = {
    code,
    name: String(newSession?.name || '').trim() || `Academic Session ${code.replace('-', '–')}`,
    startDate: newSession?.startDate || `${startYear}-04-01`,
    endDate: newSession?.endDate || `${endYear}-03-31`,
    isCurrent: Boolean(newSession?.isCurrent),
  };

  const updated = (sessions || []).map((s: any) => (entry.isCurrent ? { ...s, isCurrent: false } : { ...s }));
  return [entry, ...updated];
}

/**
 * Safely removes dummy test student records and their associated dummy ledger items
 * while strictly preserving school settings, staff user accounts, configurable academic sessions,
 * classes, sections, and fee structures.
 */
export function purgeDummyTestStudentRecords(stateObj: any) {
  const dummySet = new Set(DUMMY_STUDENT_ADMISSION_NUMBERS.map((a) => a.toLowerCase()));
  const removedStudents = (stateObj.students || []).filter(
    (s: any) =>
      s.isDummyTestRecord === true ||
      dummySet.has(String(s.admissionNumber || '').trim().toLowerCase()) ||
      /^(dummy|test)\//i.test(String(s.admissionNumber || '').trim())
  );
  const removedIds = new Set(removedStudents.map((s: any) => s.id));
  const remainingStudents = (stateObj.students || []).filter((s: any) => !removedIds.has(s.id));

  const remainingCharges = (stateObj.charges || []).filter((c: any) => !removedIds.has(c.studentId));
  const remainingChargeIds = new Set(remainingCharges.map((c: any) => c.id));
  const remainingPayments = (stateObj.payments || []).filter((p: any) => !removedIds.has(p.studentId));
  const remainingPaymentIds = new Set(remainingPayments.map((p: any) => p.id));
  const remainingAllocations = (stateObj.allocations || []).filter(
    (a: any) => remainingPaymentIds.has(a.paymentId) && remainingChargeIds.has(a.chargeId)
  );
  const remainingConcessions = (stateObj.concessions || []).filter((c: any) => !removedIds.has(c.studentId));

  return {
    cleanedState: {
      ...stateObj,
      students: remainingStudents,
      ...(stateObj.charges ? { charges: remainingCharges } : {}),
      ...(stateObj.payments ? { payments: remainingPayments } : {}),
      ...(stateObj.allocations ? { allocations: remainingAllocations } : {}),
      ...(stateObj.concessions ? { concessions: remainingConcessions } : {}),
    },
    removedStudentCount: removedStudents.length,
    removedAdmissionNumbers: removedStudents.map((s: any) => s.admissionNumber),
  };
}

// ============================================================================
// REAL-WORLD AUTHENTICATION, API SECURITY, DISPLAY NAME & SESSION LIFECYCLE
// ============================================================================

export function authenticateStaffAccount(
  accounts: any,
  identifier: string,
  password: string,
  sessionTtlMs = 8 * 60 * 60 * 1000,
  nowMs = Date.now()
) {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPwd = String(password || '');
  if (!cleanId || !cleanPwd) {
    return {
      authenticated: false,
      status: 401,
      errorCode: 'INVALID_CREDENTIALS',
      messageHi: 'कृपया यूज़रनेम/ईमेल और पासवर्ड दर्ज करें।',
      messageEn: 'Please enter your username/email and password.',
    };
  }

  const acc = (accounts || []).find(
    (a: any) =>
      String(a.username || '').trim().toLowerCase() === cleanId ||
      (a.email && String(a.email).trim().toLowerCase() === cleanId)
  );

  if (!acc || acc.password !== cleanPwd) {
    return {
      authenticated: false,
      status: 401,
      errorCode: 'INVALID_CREDENTIALS',
      messageHi: 'अमान्य यूज़रनेम/ईमेल या पासवर्ड।',
      messageEn: 'Invalid username/email or password.',
    };
  }

  if (acc.isActive === false) {
    return {
      authenticated: false,
      status: 403,
      errorCode: 'ACCOUNT_DEACTIVATED',
      messageHi: 'यह स्टाफ खाता निष्क्रिय है। कृपया व्यवस्थापक (Admin) से संपर्क करें।',
      messageEn: 'This staff account is deactivated. Please contact the administrator.',
    };
  }

  const appRole = resolveTwoRoleMode([acc.role]);
  return {
    authenticated: true,
    status: 200,
    user: {
      id: acc.id,
      username: acc.username,
      email: acc.email || '',
      fullName: acc.fullName,
      role: acc.role,
      appRole,
    },
    redirectTo: '/',
    dashboardType: appRole === 'ADMIN' ? 'ADMIN_DASHBOARD' : 'FEE_COLLECTOR_DASHBOARD',
    sessionExpiresAtMs: nowMs + sessionTtlMs,
  };
}

export function evaluateSessionState(session: any, nowMs = Date.now()) {
  if (!session || !session.isAuthenticated || !session.user) {
    return {
      valid: false,
      status: 401,
      errorCode: 'UNAUTHORIZED',
      redirectTo: '/login',
    };
  }
  if (session.revoked || (session.expiresAtMs && nowMs >= session.expiresAtMs)) {
    return {
      valid: false,
      status: 401,
      errorCode: 'SESSION_EXPIRED',
      redirectTo: '/login',
    };
  }
  return {
    valid: true,
    status: 200,
    appRole: resolveTwoRoleMode([session.user.role || session.user.appRole || 'CASHIER']),
  };
}

export function evaluateBackendApiSecurity(request: any) {
  const method = String(request?.method || 'GET').toUpperCase();
  const rawPath = String(request?.path || '').split('?')[0];
  const nodeEnv = String(request?.nodeEnv || 'production');
  const nowMs = request?.nowMs ?? Date.now();

  // Public auth & liveness endpoints
  if (
    (method === 'POST' && rawPath === '/api/v1/auth/login') ||
    (method === 'GET' && rawPath === '/api/v1/auth/setup-status') ||
    (method === 'POST' && rawPath === '/api/v1/auth/setup-initial-admin') ||
    (method === 'GET' && rawPath === '/api/v1/health')
  ) {
    return { allowed: true, status: 200 };
  }

  const sessionCheck = evaluateSessionState(request?.session, nowMs);
  if (!sessionCheck.valid) {
    return {
      allowed: false,
      status: 401,
      errorCode: sessionCheck.errorCode,
      redirectTo: '/login',
    };
  }

  // Development-only dummy-records cleanup gate
  if (rawPath === '/api/v1/students/dummy-records' && method === 'DELETE') {
    if (nodeEnv === 'production') {
      return {
        allowed: false,
        status: 403,
        errorCode: 'DEVELOPMENT_ONLY_ENDPOINT',
      };
    }
    if (sessionCheck.appRole !== 'ADMIN') {
      return {
        allowed: false,
        status: 403,
        errorCode: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
      };
    }
    return { allowed: true, status: 200 };
  }

  if (sessionCheck.appRole === 'ADMIN') {
    return { allowed: true, status: 200 };
  }

  // Fee Collector (CASHIER) allowed endpoints
  const feeCollectorAllowed =
    (method === 'GET' && rawPath === '/api/v1/auth/me') ||
    (method === 'POST' && rawPath === '/api/v1/auth/logout') ||
    (method === 'PATCH' && rawPath === '/api/v1/auth/me/display-name') ||
    (method === 'GET' && (rawPath === '/api/v1/academic-years' || rawPath === '/api/v1/academics/academic-years')) ||
    (method === 'GET' && (rawPath === '/api/v1/classes' || rawPath === '/api/v1/academics/classes')) ||
    (method === 'GET' && rawPath === '/api/v1/students') ||
    (method === 'GET' && /^\/api\/v1\/students\/[^/]+\/profile$/.test(rawPath)) ||
    (method === 'GET' && rawPath === '/api/v1/fee-heads') ||
    (method === 'GET' && rawPath === '/api/v1/fee-structures') ||
    (method === 'POST' && rawPath === '/api/v1/payments') ||
    (method === 'GET' && rawPath === '/api/v1/payments') ||
    (method === 'GET' && /^\/api\/v1\/payments\/reconcile\/[^/]+$/.test(rawPath)) ||
    (method === 'GET' && /^\/api\/v1\/payments\/[^/]+\/receipt$/.test(rawPath)) ||
    (method === 'GET' && rawPath === '/api/v1/reports/dashboard') ||
    (method === 'GET' && rawPath === '/api/v1/reports/collections') ||
    (method === 'GET' && rawPath === '/api/v1/reports/payment-history') ||
    (method === 'GET' && rawPath === '/api/v1/settings');

  if (!feeCollectorAllowed) {
    return {
      allowed: false,
      status: 403,
      errorCode: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
    };
  }

  return { allowed: true, status: 200 };
}

export function updateStaffAccountDisplayName(params: any) {
  const accounts = Array.isArray(params?.accounts) ? params.accounts : [];
  const payments = Array.isArray(params?.payments) ? params.payments : [];
  const targetId = String(params?.targetAccountId || '').trim();
  const actorId = String(params?.actorAccountId || '').trim();
  const actorRole = resolveTwoRoleMode([params?.actorRole || 'CASHIER']);
  const nextName = String(params?.newDisplayName || '').trim();

  if (nextName.length < 2) {
    throw new Error('INVALID_DISPLAY_NAME: Display name must be at least 2 characters.');
  }
  if (actorRole !== 'ADMIN' && actorId !== targetId) {
    throw new Error('FORBIDDEN_DISPLAY_NAME_UPDATE: Only Admin or the account owner can update this display name.');
  }

  const targetExists = accounts.some((a: any) => a.id === targetId);
  if (!targetExists) {
    throw new Error('ACCOUNT_NOT_FOUND: Target staff account not found.');
  }

  const updatedAccounts = accounts.map((a: any) => {
    if (a.id !== targetId) return { ...a };
    // Preserve username, email, password, role, and status; update only fullName
    return {
      ...a,
      fullName: nextName,
    };
  });

  // Historical payments & receipt snapshots must remain immutable
  const preservedPayments = payments.map((p: any) => ({ ...p }));

  return {
    accounts: updatedAccounts,
    payments: preservedPayments,
  };
}

export function createStablePaymentAttemptKey(studentId: string): string {
  return `PAY-${studentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
