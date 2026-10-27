/**
 * Cashier Fee Collection Screen (POS) — Streamlined 4-Stage Hindi-First UI
 * Visual Stages:
 *   1. विद्यार्थी खोजें (Find Student)
 *   2. फीस देखें (Review Fees)
 *   3. भुगतान दर्ज करें (Enter Payment)
 *   4. रसीद प्राप्त करें (Get Receipt)
 * Preserves the full 12-step atomic transaction sequence, idempotency key reuse,
 * uncertain-outcome reconciliation, and exact Paise allocation logic.
 */
import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { StructuredStudentSearch } from '../components/StructuredStudentSearch';
import { apiRequest } from '../services/api';
import { formatRupees, toPaiseInt, fromPaiseInt } from '../utils/format';
import {
  createStablePaymentAttemptKey,
  StructuredStudentSearchCriteria,
  EMPTY_STRUCTURED_SEARCH_CRITERIA,
  hasAnyStructuredCriterion,
  computePaymentWorkflowSteps,
  computeFourStageFeeWorkflow,
} from '../utils/workflows';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';

export const PaymentCollectionPage: React.FC = () => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [criteria, setCriteria] = useState<StructuredStudentSearchCriteria>({
    ...EMPTY_STRUCTURED_SEARCH_CRITERIA,
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);

  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [allocationMode, setAllocationMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [transactionReference, setTransactionReference] = useState('');

  const [isPreCommitConfirmed, setIsPreCommitConfirmed] = useState(false);
  const [collectorNameAcknowledgment, setCollectorNameAcknowledgment] = useState(() => user?.fullName || '');

  const [attemptIdempotencyKey, setAttemptIdempotencyKey] = useState<string>('');
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uncertainOutcome, setUncertainOutcome] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const [committedReceipt, setCommittedReceipt] = useState<any | null>(null);
  const [hasOpenedOrPrintedReceipt, setHasOpenedOrPrintedReceipt] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [receiptPrintError, setReceiptPrintError] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiRequest<{ classes: any[] }>('/classes'),
  });
  const classes = classesData?.classes || [];

  // Prevent Stale Student & Payment State: clear ALL uncommitted state when switching students or resetting
  const clearSelectedStudentAndAttempt = () => {
    setSelectedStudent(null);
    setAmountReceived('');
    setPaymentMethod('CASH');
    setAllocationMode('AUTO');
    setSelectedChargeIds([]);
    setTransactionReference('');
    setCommittedReceipt(null);
    setHasOpenedOrPrintedReceipt(false);
    setIsPreCommitConfirmed(false);
    setCollectorNameAcknowledgment(user?.fullName || '');
    setAttemptIdempotencyKey('');
    setUncertainOutcome(false);
    setErrorMsg('');
    setReceiptPrintError('');
  };

  const handleCriteriaChange = (patch: Partial<StructuredStudentSearchCriteria>) => {
    setCriteria((prev) => ({ ...prev, ...patch }));
    setSearchError('');
    setSearchResults([]);
    setHasSearched(false);
    if (selectedStudent) {
      clearSelectedStudentAndAttempt();
    }
  };

  const handleResetSearch = () => {
    setCriteria({ ...EMPTY_STRUCTURED_SEARCH_CRITERIA });
    setSearchResults([]);
    setHasSearched(false);
    setSearchError('');
    clearSelectedStudentAndAttempt();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    clearSelectedStudentAndAttempt();
    setSearchError('');

    if (!hasAnyStructuredCriterion(criteria)) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(t('emptySearchError'));
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (criteria.studentName.trim()) params.set('studentName', criteria.studentName.trim());
      if (criteria.fatherName.trim()) params.set('fatherName', criteria.fatherName.trim());
      if (criteria.classValue.trim()) params.set('classId', criteria.classValue.trim());
      if (criteria.sectionValue.trim()) params.set('sectionId', criteria.sectionValue.trim());
      const list = await apiRequest<any>(`/students?${params.toString()}`);
      setSearchResults(list.students || []);
    } catch (err: any) {
      setSearchResults([]);
      setSearchError(err.message || (lang === 'hi' ? 'विद्यार्थी खोजने में त्रुटि हुई।' : 'Failed to search students.'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAndVerifyStudent = async (studentSummary: any) => {
    // Clear uncommitted payment inputs from any prior student before loading the newly selected student
    clearSelectedStudentAndAttempt();
    setIsLoadingStudent(true);
    try {
      const detail = await apiRequest<any>(`/students/${studentSummary.id}`);
      setSelectedStudent(detail);
      const unpaidIds = (detail.ledger?.charges || [])
        .filter((c: any) => toPaiseInt(c.outstandingAmount) > 0)
        .map((c: any) => c.chargeId);
      setSelectedChargeIds(unpaidIds);
      setAttemptIdempotencyKey(createStablePaymentAttemptKey(detail.student.id));
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'hi' ? 'विद्यार्थी का विवरण लोड नहीं हो सका।' : 'Failed to load student ledger.'));
    } finally {
      setIsLoadingStudent(false);
    }
  };

  const ledger = selectedStudent?.ledger;
  const unpaidCharges = useMemo(
    () => (ledger?.charges || []).filter((c: any) => toPaiseInt(c.outstandingAmount) > 0),
    [ledger]
  );

  const selectedChargesCount =
    allocationMode === 'AUTO' ? unpaidCharges.length : selectedChargeIds.length;

  const allocationPreview = useMemo(() => {
    const receivedPaise = toPaiseInt(amountReceived || '0');
    if (receivedPaise <= 0 || !ledger) {
      return { rows: [], allocatedPaise: 0, advancePaise: 0 };
    }
    let rem = receivedPaise;
    let allocated = 0;
    const rows: Array<{
      chargeId: string;
      feeHeadName: string;
      periodLabel: string;
      allocatedAmount: string;
      statusAfter: 'PAID' | 'PARTIALLY_PAID';
    }> = [];

    for (const ch of unpaidCharges) {
      if (rem <= 0) break;
      if (allocationMode === 'MANUAL' && !selectedChargeIds.includes(ch.chargeId)) {
        continue;
      }
      const outPaise = toPaiseInt(ch.outstandingAmount);
      if (outPaise <= 0) continue;
      const alloc = Math.min(rem, outPaise);
      rem -= alloc;
      allocated += alloc;
      rows.push({
        chargeId: ch.chargeId,
        feeHeadName: ch.feeHeadName,
        periodLabel: ch.feePeriodLabel,
        allocatedAmount: fromPaiseInt(alloc),
        statusAfter: alloc === outPaise ? 'PAID' : 'PARTIALLY_PAID',
      });
    }

    return {
      rows,
      allocatedPaise: allocated,
      advancePaise: Math.max(0, receivedPaise - allocated),
    };
  }, [amountReceived, ledger, unpaidCharges, allocationMode, selectedChargeIds]);

  const wfInput = {
    hasSearched,
    hasSelectedStudent: Boolean(selectedStudent?.student?.id),
    hasLoadedLedger: Boolean(selectedStudent?.ledger),
    allocationMode,
    selectedChargesCount,
    amountReceivedPaise: toPaiseInt(amountReceived || '0'),
    paymentMethod,
    transactionReference,
    isPreCommitConfirmed,
    isSubmitting,
    hasCommittedPayment: Boolean(committedReceipt),
    hasOpenedOrPrintedReceipt,
  };

  const workflowProgress = useMemo(() => computePaymentWorkflowSteps(wfInput), [
    hasSearched,
    selectedStudent,
    allocationMode,
    selectedChargesCount,
    amountReceived,
    paymentMethod,
    transactionReference,
    isPreCommitConfirmed,
    isSubmitting,
    committedReceipt,
    hasOpenedOrPrintedReceipt,
  ]);

  const fourStageProgress = useMemo(() => computeFourStageFeeWorkflow(wfInput), [workflowProgress]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting || !selectedStudent) return;
    if (uncertainOutcome) {
      setErrorMsg(
        lang === 'hi'
          ? 'पिछले भुगतान की स्थिति अभी स्पष्ट नहीं है। दोबारा भुगतान दर्ज करने से पहले "स्थिति जाँचें" बटन दबाएँ।'
          : 'Previous payment attempt has an uncertain outcome. Please click Reconcile Status before retrying.'
      );
      return;
    }
    if (!workflowProgress.canSubmitPayment) {
      setErrorMsg(t('confirmBeforeCommitError'));
      return;
    }

    const activeEnrollment = selectedStudent.student.enrollments?.[0];
    if (!activeEnrollment) {
      setErrorMsg(lang === 'hi' ? 'विद्यार्थी का सक्रिय नामांकन नहीं मिला।' : 'Active enrollment not found.');
      return;
    }

    const stableKey =
      attemptIdempotencyKey || createStablePaymentAttemptKey(selectedStudent.student.id);
    if (!attemptIdempotencyKey) {
      setAttemptIdempotencyKey(stableKey);
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const manualAllocations =
        allocationMode === 'MANUAL'
          ? allocationPreview.rows.map((r) => ({
              studentChargeId: r.chargeId,
              allocatedAmount: r.allocatedAmount,
            }))
          : undefined;

      const result = await apiRequest<any>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: stableKey,
          studentId: selectedStudent.student.id,
          enrollmentId: activeEnrollment.id,
          academicYearId: activeEnrollment.academicYearId,
          amountReceived,
          paymentMethod,
          transactionReference: transactionReference || undefined,
          manualAllocations,
          collectorNameAcknowledgment: (collectorNameAcknowledgment || user?.fullName || '').trim(),
        }),
      });
      setCommittedReceipt(result);
      setUncertainOutcome(false);
      const refreshed = await apiRequest<any>(`/students/${selectedStudent.student.id}`).catch(() => null);
      if (refreshed) {
        setSelectedStudent(refreshed);
      }
    } catch (err: any) {
      const message = err?.message || 'Payment request failed.';
      if (/network|fetch|timeout|failed to fetch|502|503|504/i.test(message)) {
        setUncertainOutcome(true);
        setErrorMsg(
          lang === 'hi'
            ? `सर्वर से उत्तर मिलते समय नेटवर्क संपर्क टूट गया। दोबारा भुगतान न लें! पहले कुंजी (${stableKey}) की स्थिति की जाँच करें।`
            : `Connection interrupted while waiting for server confirmation. Do NOT collect payment again. Reconcile status for key ${stableKey} first.`
        );
      } else {
        setErrorMsg(message);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReconcileUncertainPayment = async () => {
    if (!attemptIdempotencyKey || isReconciling) return;
    setIsReconciling(true);
    setErrorMsg('');
    try {
      const check = await apiRequest<{ found: boolean; payment: any; receipt: any }>(
        `/payments/reconcile/${encodeURIComponent(attemptIdempotencyKey)}`
      );
      if (check.found && check.payment) {
        setCommittedReceipt({
          idempotentReplay: true,
          payment: check.payment,
          receipt: check.receipt,
        });
        setUncertainOutcome(false);
      } else {
        setUncertainOutcome(false);
        setErrorMsg(
          lang === 'hi'
            ? 'सर्वर ने पुष्टि की है कि पिछला भुगतान दर्ज नहीं हुआ था। अब आप सुरक्षित रूप से दोबारा प्रयास कर सकते हैं।'
            : 'Server confirmed no payment was committed for this attempt. You may safely retry submitting the payment.'
        );
      }
    } catch (err: any) {
      setErrorMsg(`Reconciliation check failed: ${err.message || 'Unable to reach server.'}`);
    } finally {
      setIsReconciling(false);
    }
  };

  const handlePrintReceiptAction = (url: string) => {
    setHasOpenedOrPrintedReceipt(true);
    setReceiptPrintError('');
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      setReceiptPrintError(t('printFailureCommittedNotice'));
    }
  };

  const activeEnr = selectedStudent?.student?.enrollments?.[0];
  const studentClassLabel = activeEnr?.schoolClass?.name || selectedStudent?.student?.className || 'N/A';
  const studentSectionLabel = activeEnr?.section?.name || selectedStudent?.student?.section || 'N/A';

  return (
    <AdminLayout
      title={t('feeCollection')}
      breadcrumbs={[t('feeCollection')]}
      actions={
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs">
          {fourStageProgress.stages.map((st, idx) => (
            <React.Fragment key={st.stageNumber}>
              <span
                className={`px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                  st.status === 'CURRENT'
                    ? 'bg-svss-saffron text-white'
                    : st.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-500'
                }`}
              >
                {st.stageNumber}. {lang === 'hi' ? st.labelHi : st.labelEn}
              </span>
              {idx < 3 && <span className="text-slate-400 font-bold">→</span>}
            </React.Fragment>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-4 min-w-0">
          {/* STAGE 1: विद्यार्थी खोजें (Find Student) */}
          <StructuredStudentSearch
            mode="pos"
            criteria={criteria}
            onCriteriaChange={handleCriteriaChange}
            onSearchSubmit={handleSearch}
            onReset={handleResetSearch}
            classes={classes}
            isSearching={isSearching}
            hasSearched={hasSearched}
            searchError={searchError}
            results={searchResults}
            selectedStudentId={selectedStudent?.student?.id || null}
            onSelectStudent={handleSelectAndVerifyStudent}
            isLoadingStudent={isLoadingStudent}
          />

          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded font-medium space-y-2"
            >
              <div>{errorMsg}</div>
              {uncertainOutcome && (
                <button
                  type="button"
                  disabled={isReconciling}
                  onClick={handleReconcileUncertainPayment}
                  className="bg-svss-navy text-white px-3 py-1.5 rounded font-bold"
                >
                  {isReconciling
                    ? t('loading')
                    : lang === 'hi'
                    ? 'सर्वर से भुगतान की स्थिति जाँचें'
                    : 'Reconcile Payment Status with Server'}
                </button>
              )}
            </div>
          )}

          {/* STAGE 2: फीस देखें (Compact Student & Fee Summary — Shown only after explicit selection) */}
          {selectedStudent && ledger && (
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50/80 px-4 py-3 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs sm:text-sm font-bold text-slate-900">
                  <span className="text-svss-navy font-extrabold">{selectedStudent.student.fullName}</span>
                  {' · '}
                  <span>{t('admissionNumber')}: <strong className="font-mono">{selectedStudent.student.admissionNumber}</strong></span>
                  {' · '}
                  <span>{t('classLabel')}: <strong>{studentClassLabel}-{studentSectionLabel}</strong></span>
                  {' · '}
                  <span>{t('fatherName')}: <strong>{selectedStudent.student.guardianName}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm font-extrabold text-svss-saffron font-mono">
                    {t('outstandingFees')}: {formatRupees(ledger.totalOutstandingBalance)}
                  </span>
                  <button
                    type="button"
                    onClick={clearSelectedStudentAndAttempt}
                    className="text-xs font-bold text-red-700 hover:underline"
                  >
                    {lang === 'hi' ? 'विद्यार्थी बदलें' : 'Change Student'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">{lang === 'hi' ? 'कुल लागू फीस:' : 'Total Applicable:'}</span>{' '}
                  <strong className="font-mono">{formatRupees(ledger.totalNetPayableCharges)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{lang === 'hi' ? 'स्वीकृत छूट:' : 'Concessions:'}</span>{' '}
                  <strong className="font-mono text-emerald-700">{formatRupees(ledger.totalApprovedConcessions)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{lang === 'hi' ? 'जमा राशि:' : 'Already Paid:'}</span>{' '}
                  <strong className="font-mono text-emerald-700">{formatRupees(ledger.totalClearedCollections)}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="py-2 px-3 text-center w-12">{lang === 'hi' ? 'चुनें' : 'Select'}</th>
                      <th className="py-2 px-3 text-left">{lang === 'hi' ? 'फीस मद' : 'Fee Head'}</th>
                      <th className="py-2 px-3 text-left">{lang === 'hi' ? 'अवधि' : 'Period'}</th>
                      <th className="py-2 px-3 text-right">{lang === 'hi' ? 'देय राशि' : 'Net Payable'}</th>
                      <th className="py-2 px-3 text-right">{lang === 'hi' ? 'जमा' : 'Paid'}</th>
                      <th className="py-2 px-3 text-right">{t('outstandingFees')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledger.charges || []).map((c: any) => {
                      const hasDue = toPaiseInt(c.outstandingAmount) > 0;
                      const isChecked = selectedChargeIds.includes(c.chargeId);
                      return (
                        <tr key={c.chargeId} className="border-b border-slate-100">
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!hasDue || allocationMode === 'AUTO'}
                              checked={hasDue && (allocationMode === 'AUTO' || isChecked)}
                              onChange={(e) => {
                                setIsPreCommitConfirmed(false);
                                if (e.target.checked) {
                                  setSelectedChargeIds((prev) => [...prev, c.chargeId]);
                                } else {
                                  setSelectedChargeIds((prev) => prev.filter((id) => id !== c.chargeId));
                                }
                              }}
                            />
                          </td>
                          <td className="py-2 px-3 font-semibold">{c.feeHeadName}</td>
                          <td className="py-2 px-3">{c.feePeriodLabel}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatRupees(c.netPayableAmount)}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatRupees(c.clearedPaidAmount)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-svss-saffron">{formatRupees(c.outstandingAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAGE 3: भुगतान दर्ज करें (Enter Payment Form) */}
          {selectedStudent && ledger && (
            <form onSubmit={handleSubmitPayment} className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                  {t('stage3')}
                </h3>
                <select
                  value={allocationMode}
                  onChange={(e) => {
                    setAllocationMode(e.target.value as 'AUTO' | 'MANUAL');
                    setIsPreCommitConfirmed(false);
                  }}
                  className="border border-slate-300 rounded px-2 py-1 text-xs bg-white font-medium"
                >
                  <option value="AUTO">
                    {lang === 'hi' ? 'स्वतः समायोजन (पुरानी बकाया पहले)' : 'Auto Oldest-Due-First'}
                  </option>
                  <option value="MANUAL">
                    {lang === 'hi' ? 'चयनित मदों में समायोजन' : 'Manual Selection'}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('amountToPay')} (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amountReceived}
                    onChange={(e) => {
                      setAmountReceived(e.target.value);
                      setIsPreCommitConfirmed(false);
                    }}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('paymentMethod')} *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value as any);
                      setIsPreCommitConfirmed(false);
                    }}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white font-semibold"
                  >
                    <option value="CASH">{lang === 'hi' ? 'नकद (CASH)' : 'CASH'}</option>
                    <option value="UPI">{lang === 'hi' ? 'UPI (QR / मोबाइल भुगतान)' : 'UPI'}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'hi' ? 'लेन-देन संदर्भ / UTR संख्या' : 'Reference / UTR No'}
                  </label>
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder={lang === 'hi' ? 'नकद के लिए वैकल्पिक' : 'Optional for Cash'}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              {/* Concise Pre-Commit Confirmation */}
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2 text-xs">
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {lang === 'hi' ? 'वसूलीकर्ता का पूरा नाम (पावती) *' : 'Collector Full-Name Acknowledgment *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={collectorNameAcknowledgment}
                    onChange={(e) => setCollectorNameAcknowledgment(e.target.value)}
                    placeholder={user?.fullName || (lang === 'hi' ? 'अपना पूरा नाम लिखें' : 'Enter collector full name')}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-semibold"
                  />
                </div>
                <label className="flex items-start gap-2 pt-0.5 cursor-pointer select-none font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isPreCommitConfirmed}
                    onChange={(e) => setIsPreCommitConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-400"
                  />
                  <span>
                    {lang === 'hi'
                      ? `मैं पुष्टि करता/करती हूँ कि विद्यार्थी (${selectedStudent.student.fullName}, ${selectedStudent.student.admissionNumber}) और राशि की जाँच कर ली गई है।`
                      : `I confirm the student identity (${selectedStudent.student.fullName}) and payment amount.`}
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!workflowProgress.canSubmitPayment || isSubmitting || collectorNameAcknowledgment.trim().length < 2}
                  className="bg-svss-saffron hover:bg-orange-700 disabled:opacity-50 text-white px-5 py-2.5 rounded text-xs font-extrabold shadow"
                >
                  {isSubmitting ? t('loading') : t('confirmPayment')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Sticky Column: Compact Allocation Preview & Stage 4 Receipt */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 min-w-0">
          {/* Compact Allocation Preview (Only shown when a valid positive amount is entered) */}
          {selectedStudent && toPaiseInt(amountReceived || '0') > 0 && (
            <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm space-y-2 text-xs">
              <div className="font-extrabold text-slate-800 border-b pb-1.5">
                {lang === 'hi' ? 'फीस समायोजन विवरण' : 'Fee Allocation Preview'}
              </div>
              {allocationPreview.rows.map((r) => (
                <div key={r.chargeId} className="flex justify-between border-b border-slate-100 pb-1">
                  <span>{r.feeHeadName} ({r.periodLabel})</span>
                  <span className="font-mono font-bold">{formatRupees(r.allocatedAmount)}</span>
                </div>
              ))}
              {allocationPreview.advancePaise > 0 && (
                <div className="flex justify-between text-svss-navy font-bold pt-1">
                  <span>{lang === 'hi' ? 'अग्रिम जमा (Advance):' : 'Advance Credit:'}</span>
                  <span className="font-mono">{formatRupees(fromPaiseInt(allocationPreview.advancePaise))}</span>
                </div>
              )}
            </div>
          )}

          {/* STAGE 4: रसीद प्राप्त करें (Committed Receipt Panel) */}
          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-extrabold uppercase tracking-wide text-slate-700">
                {t('stage4')}
              </h3>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                {committedReceipt ? (lang === 'hi' ? 'भुगतान सफल ✓' : 'COMMITTED ✓') : lang === 'hi' ? 'प्रतीक्षा में' : 'PENDING'}
              </span>
            </div>

            {receiptPrintError && (
              <div role="alert" className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-950 text-[11px]">
                {receiptPrintError}
              </div>
            )}

            {committedReceipt ? (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-950 space-y-2">
                <div className="font-mono font-extrabold text-sm">
                  {committedReceipt.receipt?.receiptNumber}
                </div>
                <div>
                  {t('studentName')}: <strong>{selectedStudent?.student?.fullName}</strong>
                </div>
                <div>
                  {t('amountToPay')}: <strong className="font-mono">{formatRupees(committedReceipt.payment?.amountReceived || '0.00')}</strong>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handlePrintReceiptAction(
                        `/api/v1/payments/${committedReceipt.payment.id}/receipt?format=HTML&layout=A4`
                      )
                    }
                    className="w-full bg-svss-navy hover:bg-blue-900 text-white py-1.5 rounded font-bold"
                  >
                    {t('printReceipt')} (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePrintReceiptAction(
                        `/api/v1/payments/${committedReceipt.payment.id}/receipt?format=HTML&reprint=true&layout=THERMAL`
                      )
                    }
                    className="w-full border border-svss-navy text-svss-navy hover:bg-blue-50 py-1.5 rounded font-bold"
                  >
                    {t('reprintReceipt')} (80mm)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500">
                {lang === 'hi'
                  ? 'भुगतान की पुष्टि होने के बाद आधिकारिक रसीद संख्या यहाँ दिखाई देगी।'
                  : 'Official numbered receipt appears here after payment is committed.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
