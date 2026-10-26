/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN — Production Module Automated Test Suite
 * Imports and tests the actual production implementation files:
 *  - apps/api/src/utils/money.ts
 *  - apps/api/src/security/password.ts
 *  - apps/api/src/security/session-csrf.ts
 *  - apps/api/src/services/ledger-engine.ts
 *  - apps/api/src/exports/spreadsheet-sanitizer.ts
 *  - apps/web/src/utils/workflows.ts
 *  - scripts/backup/backup-db.js
 *  - scripts/restore/restore-db.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Direct imports from actual production modules
import {
  toPaise,
  fromPaise,
  addMoney,
  subMoney,
  formatINR,
  amountToIndianWords,
} from '../apps/api/src/utils/money.ts';

import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  sanitizeForAuditAndResponse,
} from '../apps/api/src/security/password.ts';

import {
  generateSessionPair,
  hashSessionToken,
  verifyCsrfToken,
} from '../apps/api/src/security/session-csrf.ts';

import {
  calculateStudentLedger,
  buildAndValidateAllocationPlan,
  calculateConcessionAmount,
  calculateLateFeeForCharge,
  formatReceiptNumber,
  SUPPORTED_PAYMENT_METHODS,
  validateSupportedPaymentMethod,
} from '../apps/api/src/services/ledger-engine.ts';

import {
  sanitizeSpreadsheetText,
} from '../apps/api/src/exports/spreadsheet-sanitizer.ts';

import {
  reduceCashierSearchState,
  buildSessionScopedUrl,
  PaymentAttemptTracker,
  resolveAuthRouteGuard,
  hasAnyStructuredCriterion,
  filterStudentsByStructuredCriteria,
  getStudentAutocompleteSuggestions,
  buildAutoFillCriteriaFromStudent,
  computePaymentWorkflowSteps,
  computeFourStageFeeWorkflow,
  createEmptyUncommittedPaymentState,
  HINDI_FIRST_LABELS,
  getLocalizedLabel,
  formatRoleLabel,
  resolveTwoRoleMode,
  resolveRoleRouteAccess,
  getPermittedReportsForRole,
  REQUIRED_STUDENT_REGISTRATION_FIELDS,
  DUMMY_STUDENT_ADMISSION_NUMBERS,
  validateStudentRegistrationInput,
  addConfigurableAcademicSession,
  purgeDummyTestStudentRecords,
  authenticateStaffAccount,
  evaluateSessionState,
  evaluateBackendApiSecurity,
  updateStaffAccountDisplayName,
} from '../apps/web/src/utils/workflows.ts';


import {
  inspectDatabaseConfiguration,
  redactConnectionString,
  assertSafeMigrationCommand,
} from '../apps/api/src/utils/db-config.ts';

import {
  evaluateNeonReadiness,
} from '../scripts/db/verify-neon-deployment.js';

import {
  validateBackupEncryptionKey,
  encryptBufferAes256Gcm,
  decryptBufferAes256Gcm,
  verifyWrittenBackupFile,
  isDirectExecution,
} from '../scripts/backup/backup-db.js';

import {
  verifyAndExtractBackup,
} from '../scripts/restore/restore-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('1. Production Ledger Engine & Monetary Math (apps/api/src/services/ledger-engine.ts & money.ts)', () => {
  it('calculates exact paise arithmetic and Indian numbering words without floating-point drift', () => {
    assert.equal(addMoney('0.10', '0.20'), '0.30');
    assert.equal(subMoney('6000.00', '2000.00'), '4000.00');
    assert.equal(formatINR('125450.50'), '₹1,25,450.50');
    assert.equal(amountToIndianWords('2500.00'), 'Rupees Two Thousand Five Hundred Only');
    assert.equal(
      amountToIndianWords('125450.50'),
      'Rupees One Lakh Twenty Five Thousand Four Hundred and Fifty and Fifty Paise Only'
    );
    assert.equal(formatReceiptNumber('SVSS', '2026-27', 1), 'SVSS/2026-27/000001');
  });

  it('settles full, partial, and multi-month CASH and UPI charges, tracks advance credits, and rejects CHEQUE payments', () => {
    // Verify backend payment method validator accepts only CASH and UPI and rejects CHEQUE
    assert.deepEqual(SUPPORTED_PAYMENT_METHODS, ['CASH', 'UPI']);
    assert.equal(validateSupportedPaymentMethod('CASH').valid, true);
    assert.equal(validateSupportedPaymentMethod('UPI').valid, true);
    const rejectedCheque = validateSupportedPaymentMethod('CHEQUE');
    assert.equal(rejectedCheque.valid, false);
    assert.equal(rejectedCheque.errorCode, 'UNSUPPORTED_PAYMENT_METHOD');
    assert.equal(validateSupportedPaymentMethod('BANK_TRANSFER').valid, false);
    assert.equal(validateSupportedPaymentMethod('CARD').valid, false);

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
        status: 'UNPAID',
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
        status: 'UNPAID',
      },
    ];

    const ledgerInitial = calculateStudentLedger('st-1', charges, [], '0.00', {
      referenceDate: '2026-05-25',
    });

    assert.equal(ledgerInitial.totalGrossCharges, '4000.00');
    assert.equal(ledgerInitial.totalApprovedConcessions, '500.00');
    assert.equal(ledgerInitial.totalNetPayableCharges, '3500.00');
    assert.equal(ledgerInitial.totalOutstandingBalance, '3500.00');

    // Oldest-first allocation of ₹2,500 settles April (₹2,000) and partially pays May (₹500)
    const ownershipMap = new Map([
      ['ch-apr', 'st-1'],
      ['ch-may', 'st-1'],
    ]);
    const plan = buildAndValidateAllocationPlan({
      studentId: 'st-1',
      amountReceived: '2500.00',
      ledgerCharges: ledgerInitial.charges,
      chargeOwnershipMap: ownershipMap,
    });

    assert.equal(plan.amountAllocated, '2500.00');
    assert.equal(plan.advanceCreditAmount, '0.00');
    assert.equal(plan.allocations.length, 2);
    assert.equal(plan.allocations[0].studentChargeId, 'ch-apr');
    assert.equal(plan.allocations[0].allocatedAmount, '2000.00');
    assert.equal(plan.allocations[0].newChargeStatus, 'PAID');
    assert.equal(plan.allocations[1].studentChargeId, 'ch-may');
    assert.equal(plan.allocations[1].allocatedAmount, '500.00');
    assert.equal(plan.allocations[1].newChargeStatus, 'PARTIALLY_PAID');

    // Rejects cross-student charge ID or over-allocation
    assert.throws(() =>
      buildAndValidateAllocationPlan({
        studentId: 'st-1',
        amountReceived: '5000.00',
        ledgerCharges: ledgerInitial.charges,
        chargeOwnershipMap: ownershipMap,
        manualAllocations: [{ studentChargeId: 'ch-apr', allocatedAmount: '2500.00' }],
      }),
      /Cannot overpay charge/
    );

    // Completed CASH (₹2,000) + UPI (₹1,500) allocations settle all ₹3,500 net payable charges
    const ledgerWithCashAndUpi = calculateStudentLedger(
      'st-1',
      charges,
      [
        {
          id: 'alloc-cash',
          paymentId: 'pay-cash',
          studentChargeId: 'ch-apr',
          allocatedAmount: '2000.00',
          isActive: true,
          paymentStatus: 'COMPLETED',
          paymentMethod: 'CASH',
        },
        {
          id: 'alloc-upi',
          paymentId: 'pay-upi',
          studentChargeId: 'ch-may',
          allocatedAmount: '1500.00',
          isActive: true,
          paymentStatus: 'COMPLETED',
          paymentMethod: 'UPI',
        },
      ],
      '0.00'
    );
    assert.equal(ledgerWithCashAndUpi.totalClearedCollections, '3500.00');
    assert.equal(ledgerWithCashAndUpi.totalOutstandingBalance, '0.00');
  });

  it('calculates fixed/percentage concessions and late fees accurately', () => {
    assert.equal(calculateConcessionAmount('2000.00', 'FIXED_AMOUNT', '500.00'), '500.00');
    assert.equal(calculateConcessionAmount('2000.00', 'PERCENTAGE', '25'), '500.00');
    assert.throws(() => calculateConcessionAmount('2000.00', 'FIXED_AMOUNT', '2500.00'), /cannot exceed original charge/);

    const lateFee = calculateLateFeeForCharge({
      dueDate: '2026-04-10',
      asOfDate: '2026-04-20',
      outstandingAmount: '2000.00',
      ruleType: 'PER_DAY',
      rateAmount: '10.00',
      graceDays: 5,
      maxCapAmount: '200.00',
    });
    assert.equal(lateFee.lateFeeAmount, '100.00');
    assert.equal(lateFee.daysLateAfterGrace, 5);
  });
});

describe('2. Production Authentication, Password Hashing, CSRF & Route Guard (Problem 1)', () => {
  it('hashes and verifies passwords using production scrypt and enforces password policy', async () => {
    assert.throws(() => validatePasswordPolicy('short1A'), /at least 10 characters/);
    assert.throws(() => validatePasswordPolicy('alllowercase123'), /uppercase/);

    const hash = await hashPassword('SwamiVivekanand#2026');
    assert.ok(hash.startsWith('$scrypt$v1$'));
    assert.equal(await verifyPassword('SwamiVivekanand#2026', hash), true);
    assert.equal(await verifyPassword('WrongPassword#2026', hash), false);
  });

  it('generates session/CSRF tokens and strips secrets from API & audit payloads', () => {
    const pair = generateSessionPair();
    assert.equal(hashSessionToken(pair.rawSessionToken), pair.tokenHash);
    assert.equal(verifyCsrfToken(pair.csrfToken, pair.csrfToken), true);
    assert.equal(verifyCsrfToken(pair.csrfToken, 'invalid-csrf'), false);

    const sanitized = sanitizeForAuditAndResponse({
      id: 'u-1',
      username: 'cashier1',
      passwordHash: '$scrypt$secret',
      csrfToken: 'secret-csrf',
      cardNumber: '4111222233334444',
      cvv: '123',
    });
    assert.equal(sanitized.username, 'cashier1');
    assert.equal(sanitized.passwordHash, undefined);
    assert.equal(sanitized.csrfToken, undefined);
    assert.equal(sanitized.cardNumber, undefined);
    assert.equal(sanitized.cvv, undefined);
  });

  it('enforces initial setup availability only when uninitialized and protects authenticated routes', () => {
    assert.deepEqual(
      resolveAuthRouteGuard({ requestedPath: '/', initialSetupRequired: true, isAuthenticated: false }),
      { allow: false, redirectTo: '/setup' }
    );
    assert.deepEqual(
      resolveAuthRouteGuard({ requestedPath: '/setup', initialSetupRequired: true, isAuthenticated: false }),
      { allow: true }
    );
    assert.deepEqual(
      resolveAuthRouteGuard({ requestedPath: '/setup', initialSetupRequired: false, isAuthenticated: false }),
      { allow: false, redirectTo: '/login' }
    );
    assert.deepEqual(
      resolveAuthRouteGuard({ requestedPath: '/collect', initialSetupRequired: false, isAuthenticated: false }),
      { allow: false, redirectTo: '/login' }
    );
    assert.deepEqual(
      resolveAuthRouteGuard({ requestedPath: '/collect', initialSetupRequired: false, isAuthenticated: true }),
      { allow: true }
    );
  });
});

describe('3. Structured Student Search, 12-Step Workflow, Session Filtering & Payment Idempotency', () => {
  it('supports searching by any combination of Student Name, Father Name, Class, and Section, never auto-selects first result, and clears stale selection on criteria change', () => {
    const roster = [
      { id: 'st-1', admissionNumber: 'SVSS/2026/001', fullName: 'Aarav Mishra', guardianName: 'Shri Rajesh Mishra', className: 'Class 10', section: 'A', primaryContactNumber: '9415201001', status: 'ACTIVE' },
      { id: 'st-2', admissionNumber: 'SVSS/2026/045', fullName: 'Aarav Kumar Mishra', guardianName: 'Shri Suresh Mishra', className: 'Class 10', section: 'B', primaryContactNumber: '9415201045', status: 'ACTIVE' },
      { id: 'st-3', admissionNumber: 'SVSS/2026/003', fullName: 'Vihaan Tiwari', guardianName: 'Shri Alok Tiwari', className: 'LKG', section: 'A', primaryContactNumber: '9415201003', status: 'ACTIVE' },
    ];

    assert.equal(hasAnyStructuredCriterion({}), false);
    assert.equal(hasAnyStructuredCriterion({ classValue: 'Class 10' }), true);

    // Search by Class + Section combination
    const secBMatches = filterStudentsByStructuredCriteria(roster, {
      classValue: 'Class 10',
      sectionValue: 'B',
    });
    assert.equal(secBMatches.length, 1);
    assert.equal(secBMatches[0].id, 'st-2');

    // Search by Father's Name only
    const fatherMatches = filterStudentsByStructuredCriteria(roster, {
      fatherName: 'Alok Tiwari',
    });
    assert.equal(fatherMatches.length, 1);
    assert.equal(fatherMatches[0].id, 'st-3');

    let state = {
      query: '',
      results: [],
      selectedStudentId: null,
      hasSearched: false,
      error: '',
    };

    const twoMatches = filterStudentsByStructuredCriteria(roster, { studentName: 'Aarav' });
    state = reduceCashierSearchState(state, { type: 'SEARCH_SUCCEEDED', results: twoMatches });
    // Must NOT auto-select results[0]
    assert.equal(state.selectedStudentId, null);
    assert.equal(state.results.length, 2);

    // Cashier explicitly selects the second student
    state = reduceCashierSearchState(state, { type: 'STUDENT_VERIFIED_AND_SELECTED', studentId: 'st-2' });
    assert.equal(state.selectedStudentId, 'st-2');

    // Changing any structured search criterion clears stale selection immediately
    state = reduceCashierSearchState(state, {
      type: 'CRITERIA_CHANGED',
      criteria: { sectionValue: 'A' },
    });
    assert.equal(state.selectedStudentId, null);

    // Resetting search clears results and selection
    state = reduceCashierSearchState(state, { type: 'SEARCH_RESET' });
    assert.equal(state.selectedStudentId, null);
    assert.equal(state.results.length, 0);
    assert.equal(state.hasSearched, false);
  });

  it('computes accurate 12-step payment workflow progress states (Completed, Current, Upcoming, Unavailable) and input validation', () => {
    const step1State = computePaymentWorkflowSteps({
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
    assert.equal(step1State.steps.length, 12);
    assert.equal(step1State.currentStepNumber, 1);
    assert.equal(step1State.canSubmitPayment, false);
    assert.equal(step1State.steps[0].status, 'CURRENT');
    assert.equal(step1State.steps[1].status, 'UPCOMING');
    assert.equal(step1State.steps[2].status, 'UNAVAILABLE');

    // Unsupported payment method (e.g. CHEQUE) is blocked at Step 7
    const step7ChequeBlocked = computePaymentWorkflowSteps({
      hasSearched: true,
      hasSelectedStudent: true,
      hasLoadedLedger: true,
      allocationMode: 'AUTO',
      selectedChargesCount: 2,
      amountReceivedPaise: 220000,
      paymentMethod: 'CHEQUE',
      transactionReference: '',
      isPreCommitConfirmed: false,
      isSubmitting: false,
      hasCommittedPayment: false,
      hasOpenedOrPrintedReceipt: false,
    });
    assert.equal(step7ChequeBlocked.currentStepNumber, 7);
    assert.equal(step7ChequeBlocked.canSubmitPayment, false);

    // Verified student + amount + cashier confirmation enables Step 10 atomic commit
    const step10Ready = computePaymentWorkflowSteps({
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
    assert.equal(step10Ready.currentStepNumber, 10);
    assert.equal(step10Ready.canSubmitPayment, true);
  });

  it('propagates selected academic session ID into API requests (Problem 5)', () => {
    assert.equal(
      buildSessionScopedUrl('/reports/dashboard', 'year-2026-27'),
      '/reports/dashboard?academicYearId=year-2026-27'
    );
    assert.equal(
      buildSessionScopedUrl('/students', 'year-2025-26', { q: 'Aarav', status: 'ACTIVE' }),
      '/students?academicYearId=year-2025-26&q=Aarav&status=ACTIVE'
    );
  });

  it('reuses a single stable idempotency key across retries and requires server reconciliation on uncertain outcomes (Problem 8)', () => {
    const tracker = new PaymentAttemptTracker('st-1', 'attempt101');
    const initialKey = tracker.getKey();
    assert.equal(initialKey, 'pay_st-1_attempt101');

    const firstSubmitKey = tracker.beginSubmission();
    assert.equal(firstSubmitKey, initialKey);

    assert.throws(() => tracker.beginSubmission(), /DOUBLE_SUBMIT_BLOCKED/);

    tracker.markNetworkUncertain();
    assert.throws(() => tracker.beginSubmission(), /UNCERTAIN_OUTCOME_RECONCILE_REQUIRED/);

    const recNotCommitted = tracker.reconcileWithServerResult(false);
    assert.equal(recNotCommitted.status, 'SAFE_TO_RETRY');
    assert.equal(recNotCommitted.key, initialKey);

    const retryKey = tracker.beginSubmission();
    assert.equal(retryKey, initialKey);

    tracker.markCommitted('SVSS/2026-27/000009');
    assert.throws(() => tracker.beginSubmission(), /ALREADY_COMMITTED/);
  });
});

describe('4. Spreadsheet Formula Injection Sanitizer & Backup Encryption Safety (Problems 9 & 12)', () => {
  it('sanitizes untrusted spreadsheet cells against formula injection (Problem 12)', () => {
    assert.equal(sanitizeSpreadsheetText('=1+1'), "'=1+1");
    assert.equal(sanitizeSpreadsheetText('+SUM(A1:A2)'), "'+SUM(A1:A2)");
    assert.equal(sanitizeSpreadsheetText('-400'), "'-400");
    assert.equal(sanitizeSpreadsheetText('@HYPERLINK("http://evil")'), `'@HYPERLINK("http://evil")`);
    assert.equal(sanitizeSpreadsheetText("=cmd|'/C calc'!A0"), "'=cmd|'/C calc'!A0");
    assert.equal(sanitizeSpreadsheetText('Swami Vivekanand Sikshan Sansthan'), 'Swami Vivekanand Sikshan Sansthan');
  });

  it('rejects missing, malformed, or weak fallback encryption keys and verifies Windows & POSIX direct-execution detection (Problem 9)', () => {
    assert.throws(() => validateBackupEncryptionKey(undefined), /BACKUP_ENCRYPTION_KEY_HEX is missing/);
    assert.throws(() => validateBackupEncryptionKey('short_key'), /must be an exact 64-character hexadecimal/);
    assert.throws(
      () => validateBackupEncryptionKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
      /known weak\/example key/
    );

    assert.equal(
      isDirectExecution(
        'file:///C:/SVSS/scripts/backup/backup-db.js',
        'C:\\SVSS\\scripts\\backup\\backup-db.js'
      ),
      true
    );
    assert.equal(
      isDirectExecution(
        'file:///C:/SVSS/scripts/backup/backup-db.js',
        'C:\\SVSS\\scripts\\restore\\restore-db.js'
      ),
      false
    );
    assert.equal(
      isDirectExecution(
        'file:///opt/svss/scripts/backup/backup-db.js',
        '/opt/svss/scripts/backup/backup-db.js'
      ),
      true
    );

    const strongKeyHex = crypto.randomBytes(32).toString('hex');
    const keyBuf = validateBackupEncryptionKey(strongKeyHex);
    assert.equal(keyBuf.length, 32);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svss-backup-test-'));
    const sampleSql = '-- PostgreSQL dump for Swami Vivekanand Sikshan Sansthan\nSELECT 1;\n';
    const compressed = zlib.gzipSync(Buffer.from(sampleSql, 'utf8'));
    const encrypted = encryptBufferAes256Gcm(compressed, strongKeyHex);
    const sha256 = crypto.createHash('sha256').update(encrypted).digest('hex');
    const encFile = path.join(tmpDir, 'test_backup.sql.gz.enc');
    fs.writeFileSync(encFile, encrypted);

    const verified = verifyWrittenBackupFile(encFile, strongKeyHex, sha256);
    assert.equal(verified.actualSha256, sha256);
    assert.equal(verified.uncompressedBytes, Buffer.byteLength(sampleSql));

    const restored = verifyAndExtractBackup(encFile, strongKeyHex, sha256);
    assert.equal(restored.sqlText, sampleSql);

    const backupScriptPath = path.resolve(__dirname, '../scripts/backup/backup-db.js');
    const cliResult = spawnSync(process.execPath, [backupScriptPath], {
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    assert.notEqual(cliResult.status, 0);
    assert.match(cliResult.stderr, /BACKUP_ENCRYPTION_KEY_HEX is missing/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});


describe('5. Hindi-First UX, 4-Stage Workflow, Stale State Prevention & Safe Neon PostgreSQL Config', () => {
  it('provides accurate Hindi-first default labels, role formatting (Admin), and 4-stage visual workflow progression', () => {
    assert.equal(getLocalizedLabel('hi', 'dashboard'), 'मुख्य पृष्ठ');
    assert.equal(getLocalizedLabel('hi', 'findStudent'), 'विद्यार्थी खोजें');
    assert.equal(getLocalizedLabel('hi', 'feeCollection'), 'फीस जमा करें');
    assert.equal(getLocalizedLabel('hi', 'reprintReceipt'), 'रसीद दोबारा निकालें');
    assert.equal(getLocalizedLabel('hi', 'reports'), 'रिपोर्ट देखें');
    assert.equal(getLocalizedLabel('hi', 'outstandingFees'), 'बाकी फीस');
    assert.equal(getLocalizedLabel('hi', 'amountToPay'), 'जमा की जाने वाली राशि');
    assert.equal(getLocalizedLabel('hi', 'confirmPayment'), 'भुगतान की पुष्टि करें');
    assert.equal(getLocalizedLabel('hi', 'noResults'), 'कोई विद्यार्थी नहीं मिला');
    assert.match(HINDI_FIRST_LABELS.hi.emptySearchError, /कृपया खोजने के लिए कम से कम एक जानकारी/);

    assert.equal(formatRoleLabel('ADMINISTRATOR'), 'Admin');
    assert.equal(formatRoleLabel('CASHIER'), 'Fee Collector');

    const sampleStudents = [
      { id: 'st-1', admissionNumber: 'SVSS/2026/001', fullName: 'Aarav Mishra', guardianName: 'Shri Rajesh Mishra', className: 'Class 10', section: 'A', status: 'ACTIVE' },
      { id: 'st-2', admissionNumber: 'SVSS/2026/002', fullName: 'Ananya Verma', guardianName: 'Shri Manoj Verma', className: 'Class 5', section: 'B', status: 'ACTIVE' },
    ];
    const admPrefixMatches = filterStudentsByStructuredCriteria(sampleStudents, { admissionNumber: 'SVSS/2026/001' });
    assert.equal(admPrefixMatches.length, 1);
    assert.equal(admPrefixMatches[0].id, 'st-1');

    const nameSuggestions = getStudentAutocompleteSuggestions(sampleStudents, 'studentName', 'aar');
    assert.equal(nameSuggestions.length, 1);
    const autoFilled = buildAutoFillCriteriaFromStudent(nameSuggestions[0]);
    assert.equal(autoFilled.studentName, 'Aarav Mishra');
    assert.equal(autoFilled.fatherName, 'Shri Rajesh Mishra');

    const stage1 = computeFourStageFeeWorkflow({
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
    assert.equal(stage1.activeStageNumber, 1);
    assert.equal(stage1.stages.length, 4);
    assert.equal(stage1.stages[0].labelHi, 'विद्यार्थी खोजें');
    assert.equal(stage1.stages[1].labelHi, 'फीस देखें');
    assert.equal(stage1.stages[2].labelHi, 'भुगतान दर्ज करें');
    assert.equal(stage1.stages[3].labelHi, 'रसीद प्राप्त करें');

    const stage2 = computeFourStageFeeWorkflow({
      hasSearched: true,
      hasSelectedStudent: true,
      hasLoadedLedger: true,
      allocationMode: 'AUTO',
      selectedChargesCount: 2,
      amountReceivedPaise: 0,
      paymentMethod: 'CASH',
      transactionReference: '',
      isPreCommitConfirmed: false,
      isSubmitting: false,
      hasCommittedPayment: false,
      hasOpenedOrPrintedReceipt: false,
    });
    assert.equal(stage2.activeStageNumber, 2);

    const stage3 = computeFourStageFeeWorkflow({
      hasSearched: true,
      hasSelectedStudent: true,
      hasLoadedLedger: true,
      allocationMode: 'AUTO',
      selectedChargesCount: 2,
      amountReceivedPaise: 150000,
      paymentMethod: 'CASH',
      transactionReference: '',
      isPreCommitConfirmed: true,
      isSubmitting: false,
      hasCommittedPayment: false,
      hasOpenedOrPrintedReceipt: false,
    });
    assert.equal(stage3.activeStageNumber, 3);
    assert.equal(stage3.canSubmitPayment, true);

    const stage4 = computeFourStageFeeWorkflow({
      hasSearched: true,
      hasSelectedStudent: true,
      hasLoadedLedger: true,
      allocationMode: 'AUTO',
      selectedChargesCount: 2,
      amountReceivedPaise: 150000,
      paymentMethod: 'CASH',
      transactionReference: '',
      isPreCommitConfirmed: true,
      isSubmitting: false,
      hasCommittedPayment: true,
      hasOpenedOrPrintedReceipt: false,
    });
    assert.equal(stage4.activeStageNumber, 4);
    assert.equal(stage4.stages[3].status, 'COMPLETED');

    const emptyUncommitted = createEmptyUncommittedPaymentState();
    assert.equal(emptyUncommitted.selectedStudentId, null);
    assert.equal(emptyUncommitted.amountReceived, '');
    assert.equal(emptyUncommitted.isPreCommitConfirmed, false);
  });

  it('validates Neon Hosted PostgreSQL pooled + direct URLs, redacts credentials, and blocks destructive schema resets', () => {
    const neonEnv = {
      DATABASE_URL: 'postgresql://svss_owner:SuperSecretPass123@ep-autumn-pond-123456-pooler.ap-southeast-1.aws.neon.tech/svss_fee_db?sslmode=require&pgbouncer=true',
      DIRECT_URL: 'postgresql://svss_owner:SuperSecretPass123@ep-autumn-pond-123456.ap-southeast-1.aws.neon.tech/svss_fee_db?sslmode=require',
      NODE_ENV: 'production',
    };

    const summary = inspectDatabaseConfiguration(neonEnv);
    assert.equal(summary.providerMode, 'NEON_HOSTED');
    assert.equal(summary.usesConnectionPooler, true);
    assert.equal(summary.hasDirectUrl, true);
    assert.equal(summary.sslRequired, true);
    assert.equal(summary.warnings.length, 0);

    const redacted = redactConnectionString(neonEnv.DATABASE_URL);
    assert.ok(!redacted.includes('SuperSecretPass123'));
    assert.match(redacted, /ep-autumn-pond-123456-pooler\.ap-southeast-1\.aws\.neon\.tech/);

    const readiness = evaluateNeonReadiness(neonEnv);
    assert.equal(readiness.readyForLiveConnection, true);
    assert.equal(readiness.isNeon, true);
    assert.equal(readiness.usesPooler, true);

    assert.throws(
      () => assertSafeMigrationCommand(['prisma', 'migrate', 'reset'], neonEnv),
      /DESTRUCTIVE_MIGRATION_BLOCKED/
    );
    assert.throws(
      () => assertSafeMigrationCommand(['prisma', 'db', 'push', '--force-reset'], neonEnv),
      /DESTRUCTIVE_MIGRATION_BLOCKED/
    );
    assert.throws(
      () => assertSafeMigrationCommand(['prisma', 'migrate', 'dev'], neonEnv),
      /UNSAFE_PROD_MIGRATION_BLOCKED/
    );
    assert.doesNotThrow(() => assertSafeMigrationCommand(['prisma', 'migrate', 'deploy'], neonEnv));
  });

  it('enforces Two-Role System (Admin vs. Fee Collector) dashboards, route access guards, report restrictions, collector acknowledgment, and authenticated login', () => {
    // 1. Role labels & mode resolution
    assert.equal(formatRoleLabel('ADMINISTRATOR', 'en'), 'Admin');
    assert.equal(formatRoleLabel('CASHIER', 'en'), 'Fee Collector');
    assert.equal(resolveTwoRoleMode(['ADMINISTRATOR']), 'ADMIN');
    assert.equal(resolveTwoRoleMode(['CASHIER']), 'FEE_COLLECTOR');

    // 2. Route access enforcement for Admin vs Fee Collector
    assert.equal(resolveRoleRouteAccess('/admin', ['ADMINISTRATOR']).allowed, true);
    assert.equal(resolveRoleRouteAccess('/fee-structures', ['ADMINISTRATOR']).allowed, true);
    assert.equal(resolveRoleRouteAccess('/approvals', ['ADMINISTRATOR']).allowed, true);

    assert.equal(resolveRoleRouteAccess('/', ['CASHIER']).allowed, true);
    assert.equal(resolveRoleRouteAccess('/students', ['CASHIER']).allowed, true);
    assert.equal(resolveRoleRouteAccess('/payments/collect', ['CASHIER']).allowed, true);
    assert.equal(resolveRoleRouteAccess('/receipts', ['CASHIER']).allowed, true);
    assert.equal(resolveRoleRouteAccess('/reports', ['CASHIER']).allowed, true);

    const blockedFeeStruct = resolveRoleRouteAccess('/fee-structures', ['CASHIER']);
    assert.equal(blockedFeeStruct.allowed, false);
    assert.equal(blockedFeeStruct.redirectTo, '/');

    const blockedApprovals = resolveRoleRouteAccess('/approvals', ['CASHIER']);
    assert.equal(blockedApprovals.allowed, false);
    assert.equal(blockedApprovals.redirectTo, '/');

    const blockedAdmin = resolveRoleRouteAccess('/admin', ['CASHIER']);
    assert.equal(blockedAdmin.allowed, false);
    assert.equal(blockedAdmin.redirectTo, '/');

    const blockedStudentManage = resolveRoleRouteAccess('/students?mode=manage', ['CASHIER']);
    assert.equal(blockedStudentManage.allowed, false);

    // 3. Permitted reports filtering
    const adminReports = getPermittedReportsForRole(['ADMINISTRATOR']);
    assert.equal(adminReports.allowedReportIds.length, 13);
    assert.equal(adminReports.canExportExcel, true);
    const collectorReports = getPermittedReportsForRole(['CASHIER']);
    assert.equal(collectorReports.canExportExcel, false);
    assert.deepEqual(collectorReports.allowedReportIds, ['1', '2', '9', '10']);

    // 4. Verify interactive HTML & backend files contain Two-Role separation, no unauthenticated #roleSelector, Sultanpur address, and collectorNameAcknowledgment
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(currentDir, '..');
    const htmlContent = fs.readFileSync(path.join(rootDir, 'swami_vivekanand_sfms.html'), 'utf8');
    assert.ok(!htmlContent.includes('id="roleSelector"'), 'Unauthenticated role-switching dropdown must be removed');
    assert.ok(htmlContent.includes('id="staffLoginModalOverlay"'), 'Authenticated Staff Login modal must be present');
    assert.ok(htmlContent.includes('id="feeCollectorDashboardSection"'), 'Separate Fee Collector dashboard section must exist');
    assert.ok(htmlContent.includes('id="adminDashboardSection"'), 'Separate Admin dashboard section must exist');
    assert.ok(htmlContent.includes('id="posCollectorAckInput"'), 'Collector full-name acknowledgment input must exist');
    assert.ok(htmlContent.includes('Haripur, Karaudi Kalan, Kadipur, Sultanpur, Uttar Pradesh 228161'), 'Sultanpur school address must be preserved');
    assert.ok(!/cheque|bounced|pending_clearance/i.test(htmlContent), 'Zero cheque references should remain in interactive HTML UI');

    // 5. Verify Dashboard Simplification & Redundancy Removal
    assert.ok(!htmlContent.includes('chart.js') && !htmlContent.includes('classCollectionChart'), 'Charts must be removed from HTML dashboard');
    assert.ok(!htmlContent.includes('data-quick-nav'), 'Duplicate dashboard action cards must be removed');
    assert.ok(htmlContent.includes('id="kpiFeesReceived"') && htmlContent.includes('id="kpiFeesRemaining"') && htmlContent.includes('id="kpiTotalStudents"') && htmlContent.includes('id="kpiTodayCollection"'), 'Admin dashboard must have the 4 required summary cards');
    assert.ok(htmlContent.includes('id="dashboardRecentReceipts"') && htmlContent.includes('id="dashboardPendingStudents"'), 'Admin dashboard must have Recent Receipts and Students with Pending Fees');
    assert.ok(!htmlContent.includes('id="posSubHeading"') && !htmlContent.includes('id="posPreCommitStudentSummary"'), 'Duplicate POS workflow subtitle and repeated student summaries must be removed');
    assert.ok(htmlContent.includes('id="posStagePill1"') && htmlContent.includes('id="posStagePill4"'), 'Single clear 4-stage fee collection indicator must be retained');

    const reactDash = fs.readFileSync(path.join(rootDir, 'apps/web/src/pages/DashboardPage.tsx'), 'utf8');
    assert.ok(!reactDash.includes('recharts') && !reactDash.includes('BarChart'), 'Charts must be removed from React DashboardPage.tsx');
    assert.ok(reactDash.includes('Fees Received') && reactDash.includes('Fees Remaining') && reactDash.includes('Total Students') && reactDash.includes("Today's Collection") && reactDash.includes('Students with Pending Fees'), 'React Admin Dashboard must include the 4 summary cards, Recent Receipts, and Students with Pending Fees');
  });

  it('validates the 8-field Student Registration Form, prevents duplicate registration numbers, keeps academic sessions configurable, and safely removes dummy test student records', () => {
    // 1. Verify exact 8 required registration fields
    assert.deepEqual(REQUIRED_STUDENT_REGISTRATION_FIELDS, [
      'admissionNumber',
      'fullName',
      'guardianName',
      'primaryContactNumber',
      'address',
      'classValue',
      'sectionValue',
      'academicSession',
    ]);

    // Missing required field validation
    const missingFather = validateStudentRegistrationInput({
      admissionNumber: 'SVSS/2026/101',
      fullName: 'Rohan Yadav',
      guardianName: '',
      primaryContactNumber: '9415001122',
      address: 'Haripur, Kadipur, Sultanpur',
      classValue: 'Class 6',
      sectionValue: 'A',
      academicSession: '2026-27',
    });
    assert.equal(missingFather.valid, false);
    assert.equal(missingFather.errorCode, 'MISSING_REQUIRED_FIELD');
    assert.equal(missingFather.field, 'guardianName');

    // Invalid mobile number validation
    const badPhone = validateStudentRegistrationInput({
      admissionNumber: 'SVSS/2026/101',
      fullName: 'Rohan Yadav',
      guardianName: 'Shri Dinesh Yadav',
      primaryContactNumber: '12345',
      address: 'Haripur, Kadipur, Sultanpur',
      classValue: 'Class 6',
      sectionValue: 'A',
      academicSession: '2026-27',
    });
    assert.equal(badPhone.valid, false);
    assert.equal(badPhone.errorCode, 'INVALID_MOBILE_NUMBER');

    // Valid 8-field student registration
    const validReg = validateStudentRegistrationInput(
      {
        admissionNumber: 'SVSS/2026/101',
        fullName: 'Rohan Yadav',
        guardianName: 'Shri Dinesh Yadav',
        primaryContactNumber: '9415001122',
        address: 'Haripur, Karaudi Kalan, Kadipur, Sultanpur',
        classValue: 'Class 6',
        sectionValue: 'A',
        academicSession: '2026-27',
      },
      []
    );
    assert.equal(validReg.valid, true);
    assert.equal(validReg.normalized.admissionNumber, 'SVSS/2026/101');
    assert.equal(validReg.normalized.academicSession, '2026-27');



    // Duplicate registration / admission number prevention (case-insensitive)
    const dupReg = validateStudentRegistrationInput(
      {
        admissionNumber: 'svss/2026/101',
        fullName: 'Another Student',
        guardianName: 'Shri Rakesh Kumar',
        primaryContactNumber: '9415009988',
        address: 'Kadipur, Sultanpur',
        classValue: 'Class 7',
        sectionValue: 'B',
        academicSession: '2026-27',
      },
      [{ id: 'st-real-1', admissionNumber: 'SVSS/2026/101' }]
    );
    assert.equal(dupReg.valid, false);
    assert.equal(dupReg.errorCode, 'DUPLICATE_ADMISSION_NUMBER');

    // 2. Configurable academic sessions (not hardcoded)
    const baseSessions = [
      { code: '2026-27', name: 'Academic Session 2026–27', startDate: '2026-04-01', endDate: '2027-03-31', isCurrent: true },
      { code: '2025-26', name: 'Academic Session 2025–26', startDate: '2025-04-01', endDate: '2026-03-31', isCurrent: false },
    ];
    const updatedSessions = addConfigurableAcademicSession(baseSessions, {
      code: '2027-28',
      name: 'Academic Session 2027–28',
      isCurrent: true,
    });
    assert.equal(updatedSessions.length, 3);
    assert.equal(updatedSessions[0].code, '2027-28');
    assert.equal(updatedSessions[0].isCurrent, true);
    assert.equal(updatedSessions[1].isCurrent, false);
    assert.throws(() => addConfigurableAcademicSession(updatedSessions, { code: '2027-28' }), /DUPLICATE_ACADEMIC_SESSION/);

    // 3. Safe removal of dummy test student records while preserving settings, sessions, fee structures, and staff accounts
    assert.deepEqual(DUMMY_STUDENT_ADMISSION_NUMBERS, ['SVSS/2026/001', 'SVSS/2026/002', 'SVSS/2026/003', 'SVSS/2026/004']);
    const stateWithDummyAndReal = {
      schoolSettings: {
        schoolName: 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
        address: 'Haripur, Karaudi Kalan, Kadipur, Sultanpur, Uttar Pradesh 228161',
      },
      staffAccounts: [
        { username: 'admin.svss', role: 'ADMINISTRATOR' },
        { username: 'collector.svss', role: 'CASHIER' },
      ],
      academicSessions: updatedSessions,
      feeStructures: [{ id: 'fs-1', className: 'Class 6', tuition: '1700.00' }],
      students: [
        { id: 'st-1', admissionNumber: 'SVSS/2026/001', fullName: 'Aarav Mishra' },
        { id: 'st-2', admissionNumber: 'SVSS/2026/002', fullName: 'Ananya Verma' },
        { id: 'st-real-101', admissionNumber: 'SVSS/2026/101', fullName: 'Rohan Yadav' },
      ],
      charges: [
        { id: 'ch-dummy-1', studentId: 'st-1' },
        { id: 'ch-real-101', studentId: 'st-real-101' },
      ],
      payments: [
        { id: 'pay-dummy-1', studentId: 'st-1' },
        { id: 'pay-real-101', studentId: 'st-real-101' },
      ],
      allocations: [
        { paymentId: 'pay-dummy-1', chargeId: 'ch-dummy-1' },
        { paymentId: 'pay-real-101', chargeId: 'ch-real-101' },
      ],
      concessions: [{ studentId: 'st-1' }],
    };

    const purged = purgeDummyTestStudentRecords(stateWithDummyAndReal);
    assert.equal(purged.removedStudentCount, 2);
    assert.deepEqual(purged.removedAdmissionNumbers, ['SVSS/2026/001', 'SVSS/2026/002']);
    assert.equal(purged.cleanedState.students.length, 1);
    assert.equal(purged.cleanedState.students[0].admissionNumber, 'SVSS/2026/101');
    assert.equal(purged.cleanedState.charges.length, 1);
    assert.equal(purged.cleanedState.payments.length, 1);
    assert.equal(purged.cleanedState.allocations.length, 1);
    assert.equal(purged.cleanedState.concessions.length, 0);
    // Preserves school settings, staff accounts, sessions, and fee structures
    assert.equal(purged.cleanedState.schoolSettings.schoolName, 'SWAMI VIVEKANAND SIKSHAN SANSTHAN');
    assert.equal(purged.cleanedState.staffAccounts.length, 2);
    assert.equal(purged.cleanedState.academicSessions.length, 3);
    assert.equal(purged.cleanedState.feeStructures.length, 1);

    // 4. Verify HTML & React files include all 8 registration fields, configurable sessions, and no pre-seeded dummy students
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(currentDir, '..');
    const htmlContent = fs.readFileSync(path.join(rootDir, 'swami_vivekanand_sfms.html'), 'utf8');
    for (const fieldId of ['id="nsAdmNo"', 'id="nsFullName"', 'id="nsGuardian"', 'id="nsPhone"', 'id="nsAddress"', 'id="nsClass"', 'id="nsSection"', 'id="nsAcademicSession"']) {
      assert.ok(htmlContent.includes(fieldId), `Student registration form must include ${fieldId}`);
    }
    assert.ok(htmlContent.includes('id="addAcademicSessionForm"'), 'Configurable academic session form must exist in HTML');
    assert.ok(!htmlContent.includes("fullName: 'Aarav Mishra'"), 'Dummy test student Aarav Mishra must be removed from initial HTML state');
    assert.ok(!htmlContent.includes("fullName: 'Ananya Verma'"), 'Dummy test student Ananya Verma must be removed from initial HTML state');
    assert.ok(htmlContent.includes('students: [],'), 'Initial HTML student list must start clean without dummy records');
  });

  it('enforces Home/Login page gate, unauthenticated route/API protection, role-based API authorization, display-name updates, dev-only dummy utilities, login/logout, and session expiration', () => {
    // 1. Unauthenticated Page Access Guard across all protected routes
    const protectedFrontendPaths = [
      '/',
      '/students',
      '/students/st-101',
      '/collect',
      '/receipts',
      '/reports',
      '/fee-structures',
      '/approvals',
      '/admin',
    ];
    for (const p of protectedFrontendPaths) {
      const guard = resolveAuthRouteGuard({
        requestedPath: p,
        initialSetupRequired: false,
        isAuthenticated: false,
      });
      assert.equal(guard.allow, false, `Unauthenticated access to ${p} must be blocked`);
      assert.equal(guard.redirectTo, '/login');
    }

    // 2. Login with Username OR Email, Role-Based Dashboard Redirect, Logout & Session Expiration
    const staffAccounts = [
      {
        id: 'staff-admin',
        username: 'admin.svss',
        email: 'admin@svss.edu.in',
        fullName: 'प्रशासक (School Administrator)',
        role: 'ADMINISTRATOR',
        password: 'Admin@SVSS#2026',
        isActive: true,
      },
      {
        id: 'staff-collector',
        username: 'collector.svss',
        email: 'collector@svss.edu.in',
        fullName: 'फीस संग्रहकर्ता (Fee Collector)',
        role: 'CASHIER',
        password: 'Collector@SVSS#2026',
        isActive: true,
      },
    ];

    const badLogin = authenticateStaffAccount(staffAccounts, 'admin.svss', 'WrongPassword', 3600000, 1000);
    assert.equal(badLogin.authenticated, false);
    assert.equal(badLogin.status, 401);
    assert.equal(badLogin.errorCode, 'INVALID_CREDENTIALS');

    // Login via Username -> Admin Dashboard redirect
    const adminLogin = authenticateStaffAccount(staffAccounts, 'admin.svss', 'Admin@SVSS#2026', 3600000, 1000);
    assert.equal(adminLogin.authenticated, true);
    assert.equal(adminLogin.user.appRole, 'ADMIN');
    assert.equal(adminLogin.redirectTo, '/');
    assert.equal(adminLogin.dashboardType, 'ADMIN_DASHBOARD');
    assert.equal(adminLogin.sessionExpiresAtMs, 3601000);

    // Login via Email -> Fee Collector Dashboard redirect
    const collectorEmailLogin = authenticateStaffAccount(staffAccounts, 'collector@svss.edu.in', 'Collector@SVSS#2026', 3600000, 1000);
    assert.equal(collectorEmailLogin.authenticated, true);
    assert.equal(collectorEmailLogin.user.appRole, 'FEE_COLLECTOR');
    assert.equal(collectorEmailLogin.redirectTo, '/');
    assert.equal(collectorEmailLogin.dashboardType, 'FEE_COLLECTOR_DASHBOARD');

    // Session expiration & logout checks
    const activeAdminSession = {
      isAuthenticated: true,
      user: adminLogin.user,
      expiresAtMs: adminLogin.sessionExpiresAtMs,
      revoked: false,
    };
    assert.equal(evaluateSessionState(activeAdminSession, 2000).valid, true);
    const expiredSessionCheck = evaluateSessionState(activeAdminSession, 4000000);
    assert.equal(expiredSessionCheck.valid, false);
    assert.equal(expiredSessionCheck.status, 401);
    assert.equal(expiredSessionCheck.errorCode, 'SESSION_EXPIRED');
    assert.equal(expiredSessionCheck.redirectTo, '/login');

    const loggedOutSessionCheck = evaluateSessionState({ ...activeAdminSession, revoked: true }, 2000);
    assert.equal(loggedOutSessionCheck.valid, false);
    assert.equal(loggedOutSessionCheck.errorCode, 'SESSION_EXPIRED');

    // 3. Direct Backend API Security: Unauthenticated vs Fee Collector vs Admin vs Production Dev-Gate
    const protectedApiEndpoints = [
      { method: 'GET', path: '/api/v1/students' },
      { method: 'POST', path: '/api/v1/students' },
      { method: 'GET', path: '/api/v1/students/st-1/profile' },
      { method: 'GET', path: '/api/v1/fee-structures' },
      { method: 'POST', path: '/api/v1/fee-structures' },
      { method: 'POST', path: '/api/v1/payments' },
      { method: 'GET', path: '/api/v1/payments/pay-1/receipt' },
      { method: 'GET', path: '/api/v1/approvals' },
      { method: 'GET', path: '/api/v1/reports/dashboard' },
      { method: 'GET', path: '/api/v1/reports/outstanding' },
      { method: 'GET', path: '/api/v1/reports/audit-logs' },
      { method: 'GET', path: '/api/v1/exports/daily-collection' },
      { method: 'GET', path: '/api/v1/auth/staff' },
      { method: 'PATCH', path: '/api/v1/settings' },
      { method: 'GET', path: '/api/v1/settings/backups' },
      { method: 'GET', path: '/api/v1/health/diagnostics' },
    ];

    for (const ep of protectedApiEndpoints) {
      const unauthRes = evaluateBackendApiSecurity({
        method: ep.method,
        path: ep.path,
        session: null,
        nowMs: 2000,
      });
      assert.equal(unauthRes.allowed, false, `Unauthenticated API ${ep.method} ${ep.path} must be rejected`);
      assert.equal(unauthRes.status, 401);
      assert.equal(unauthRes.errorCode, 'UNAUTHORIZED');
    }

    const activeCollectorSession = {
      isAuthenticated: true,
      user: collectorEmailLogin.user,
      expiresAtMs: collectorEmailLogin.sessionExpiresAtMs,
      revoked: false,
    };

    // Fee Collector allowed API requests
    for (const ep of [
      { method: 'GET', path: '/api/v1/students' },
      { method: 'GET', path: '/api/v1/students/st-101/profile' },
      { method: 'POST', path: '/api/v1/payments' },
      { method: 'GET', path: '/api/v1/payments/pay-1/receipt' },
      { method: 'GET', path: '/api/v1/reports/dashboard' },
      { method: 'GET', path: '/api/v1/reports/collections' },
      { method: 'PATCH', path: '/api/v1/auth/me/display-name' },
    ]) {
      const res = evaluateBackendApiSecurity({
        method: ep.method,
        path: ep.path,
        session: activeCollectorSession,
        nowMs: 2000,
      });
      assert.equal(res.allowed, true, `Fee Collector should be allowed ${ep.method} ${ep.path}`);
      assert.equal(res.status, 200);
    }

    // Fee Collector forbidden Admin API requests
    for (const ep of [
      { method: 'POST', path: '/api/v1/students' },
      { method: 'POST', path: '/api/v1/fee-structures' },
      { method: 'GET', path: '/api/v1/approvals' },
      { method: 'POST', path: '/api/v1/reversals/rev-1/review' },
      { method: 'GET', path: '/api/v1/reports/outstanding' },
      { method: 'GET', path: '/api/v1/reports/audit-logs' },
      { method: 'GET', path: '/api/v1/exports/daily-collection' },
      { method: 'GET', path: '/api/v1/auth/staff' },
      { method: 'PATCH', path: '/api/v1/settings' },
      { method: 'GET', path: '/api/v1/settings/backups' },
      { method: 'GET', path: '/api/v1/health/diagnostics' },
    ]) {
      const res = evaluateBackendApiSecurity({
        method: ep.method,
        path: ep.path,
        session: activeCollectorSession,
        nowMs: 2000,
      });
      assert.equal(res.allowed, false, `Fee Collector must be forbidden from ${ep.method} ${ep.path}`);
      assert.equal(res.status, 403);
      assert.equal(res.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    }

    // Dummy-data cleanup endpoint blocked in production, allowed only in development for Admin
    const prodDummyCleanup = evaluateBackendApiSecurity({
      method: 'DELETE',
      path: '/api/v1/students/dummy-records',
      session: activeAdminSession,
      nodeEnv: 'production',
      nowMs: 2000,
    });
    assert.equal(prodDummyCleanup.allowed, false);
    assert.equal(prodDummyCleanup.status, 403);
    assert.equal(prodDummyCleanup.errorCode, 'DEVELOPMENT_ONLY_ENDPOINT');

    const devDummyCleanup = evaluateBackendApiSecurity({
      method: 'DELETE',
      path: '/api/v1/students/dummy-records',
      session: activeAdminSession,
      nodeEnv: 'development',
      nowMs: 2000,
    });
    assert.equal(devDummyCleanup.allowed, true);
    assert.equal(devDummyCleanup.status, 200);

    // 4. Display Name Updates Preserve Login Credentials & Historical Transaction Records
    const historicalPayments = [
      {
        id: 'pay-101',
        receiptNumber: 'SVSS/2026-27/000001',
        amountReceived: '2200.00',
        cashier: 'फीस संग्रहकर्ता (Fee Collector)',
        collectorNameAcknowledgment: 'फीस संग्रहकर्ता (Fee Collector)',
      },
    ];
    const displayUpdated = updateStaffAccountDisplayName({
      accounts: staffAccounts,
      payments: historicalPayments,
      targetAccountId: 'staff-collector',
      actorAccountId: 'staff-admin',
      actorRole: 'ADMINISTRATOR',
      newDisplayName: 'श्री संतोष कुमार वर्मा',
    });
    const updatedCollector = displayUpdated.accounts.find((a) => a.id === 'staff-collector');
    assert.equal(updatedCollector.fullName, 'श्री संतोष कुमार वर्मा');
    assert.equal(updatedCollector.username, 'collector.svss', 'Username must remain unchanged');
    assert.equal(updatedCollector.email, 'collector@svss.edu.in', 'Email must remain unchanged');
    assert.equal(updatedCollector.password, 'Collector@SVSS#2026', 'Password must remain unchanged');
    assert.equal(
      displayUpdated.payments[0].cashier,
      'फीस संग्रहकर्ता (Fee Collector)',
      'Historical receipt cashier name must remain immutable'
    );

    // 5. Verify HTML & React files have clean Home/Login page, hidden protected shell by default, no hardcoded dummy staff names, and no dummy-cleanup button in UI
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(currentDir, '..');
    const htmlContent = fs.readFileSync(path.join(rootDir, 'swami_vivekanand_sfms.html'), 'utf8');
    assert.ok(htmlContent.includes('id="homeLoginPage"'), 'Dedicated Home/Login page must exist');
    assert.ok(htmlContent.includes('id="protectedAppShell" class="hidden'), 'Protected app shell must be hidden until authenticated');
    assert.ok(htmlContent.includes('isAuthenticated: false'), 'Initial HTML state must be unauthenticated');
    assert.ok(!htmlContent.includes('Dr. S. K. Dubey') && !htmlContent.includes('Shri Ramesh Kumar'), 'Hardcoded dummy staff names must be removed from HTML');
    assert.ok(!htmlContent.includes('id="purgeDummyStudentsBtn"'), 'Dummy-data cleanup button must be removed from normal application UI');

    const studentsPageContent = fs.readFileSync(path.join(rootDir, 'apps/web/src/pages/StudentsPage.tsx'), 'utf8');
    assert.ok(!studentsPageContent.includes('Remove Dummy Test Students'), 'Dummy-data cleanup button must be removed from React StudentsPage UI');
  });
});
