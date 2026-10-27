import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { apiRequest } from '../services/api';
import { formatRupees, formatISTDate } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { useAcademicSession } from '../hooks/useAcademicSession';

export const ApprovalsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { selectedAcademicYearId, selectedAcademicYear } = useAcademicSession();
  const queryClient = useQueryClient();

  // Reversal Request State
  const [paymentIdInput, setPaymentIdInput] = useState('');
  const [reversalReason, setReversalReason] = useState('');

  // Refund Request State
  const [refundPaymentId, setRefundPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [refundReason, setRefundReason] = useState('');

  // Concession Request State (Fixed Amount or Percentage on Specific Charge)
  const [concessionStudentId, setConcessionStudentId] = useState('');
  const [concessionChargeId, setConcessionChargeId] = useState('');
  const [concessionScheme, setConcessionScheme] = useState('Merit / Sibling Concession');
  const [concessionType, setConcessionType] = useState<'FIXED_AMOUNT' | 'PERCENTAGE'>('FIXED_AMOUNT');
  const [concessionValue, setConcessionValue] = useState('');
  const [concessionReason, setConcessionReason] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['approvals', selectedAcademicYearId],
    queryFn: () =>
      apiRequest<{
        concessions: any[];
        reversals: any[];
        refunds: any[];
      }>(
        `/approvals${selectedAcademicYearId ? `?academicYearId=${encodeURIComponent(selectedAcademicYearId)}` : ''}`
      ),
  });

  const handleSubmitConcessionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || !concessionStudentId.trim() || !concessionChargeId.trim() || !concessionValue.trim() || concessionReason.trim().length < 5) {
      return;
    }
    setErrorMsg('');
    setFeedbackMsg('');
    setIsBusy(true);
    try {
      await apiRequest('/concessions', {
        method: 'POST',
        body: JSON.stringify({
          studentId: concessionStudentId.trim(),
          studentChargeId: concessionChargeId.trim(),
          schemeName: concessionScheme.trim() || 'General Concession',
          concessionType,
          concessionValue: concessionValue.trim(),
          reason: concessionReason.trim(),
        }),
      });
      setConcessionChargeId('');
      setConcessionValue('');
      setConcessionReason('');
      setFeedbackMsg('Submitted student fee concession request for administrator approval.');
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit concession request.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitReversalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || !paymentIdInput.trim() || reversalReason.trim().length < 10) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsBusy(true);
    try {
      await apiRequest(`/payments/${encodeURIComponent(paymentIdInput.trim())}/reversal-requests`, {
        method: 'POST',
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });
      setPaymentIdInput('');
      setReversalReason('');
      setFeedbackMsg('Submitted reversal request for administrator review.');
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit reversal request.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || !refundPaymentId.trim() || !refundAmount.trim() || refundReason.trim().length < 8) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsBusy(true);
    try {
      await apiRequest('/refunds', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: refundPaymentId.trim(),
          refundAmount: refundAmount.trim(),
          refundMethod,
          reason: refundReason.trim(),
        }),
      });
      setRefundPaymentId('');
      setRefundAmount('');
      setRefundReason('');
      setFeedbackMsg('Submitted refund request for administrator review.');
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit refund request.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReviewConcession = async (concessionId: string, decision: 'APPROVED' | 'REJECTED') => {
    const confirmed = window.confirm(`Are you sure you want to mark this concession request as ${decision}?`);
    if (!confirmed) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsBusy(true);
    try {
      await apiRequest(`/concessions/${concessionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNotes: `${decision} by ${user?.fullName}` }),
      });
      setFeedbackMsg(`Concession request ${decision.toLowerCase()}.`);
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review concession.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReviewReversal = async (reversalId: string, decision: 'APPROVED' | 'REJECTED') => {
    const confirmed = window.confirm(
      `Confirm ${decision} for this payment reversal? Approving will deactivate allocations and restore student charge balances.`
    );
    if (!confirmed) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsBusy(true);
    try {
      await apiRequest(`/reversals/${reversalId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNotes: `${decision} by ${user?.fullName}` }),
      });
      setFeedbackMsg(`Payment reversal request ${decision.toLowerCase()}.`);
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review reversal.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReviewRefund = async (refundId: string, decision: 'APPROVED' | 'REJECTED') => {
    const confirmed = window.confirm(`Confirm ${decision} for this refund request?`);
    if (!confirmed) return;
    setErrorMsg('');
    setFeedbackMsg('');
    setIsBusy(true);
    try {
      await apiRequest(`/refunds/${refundId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNotes: `${decision} by ${user?.fullName}` }),
      });
      setFeedbackMsg(`Refund request ${decision.toLowerCase()}.`);
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review refund.');
    } finally {
      setIsBusy(false);
    }
  };

  const concessions = data?.concessions || [];
  const reversals = data?.reversals || [];
  const refunds = data?.refunds || [];

  return (
    <AdminLayout
      title={`Maker-Checker Approvals: Concessions, Reversals & Refunds (${selectedAcademicYear?.code || 'All'})`}
      breadcrumbs={['Approvals & Corrections', selectedAcademicYear?.code || 'Session']}
    >
      <div className="space-y-6 text-xs">
        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded font-medium">
            {feedbackMsg}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="p-3 bg-red-50 border border-red-300 text-red-800 rounded font-medium">
            {errorMsg}
          </div>
        )}

        {/* Request Submission Forms for Authorized Staff */}
        {hasPermission('REVERSAL_REQUEST') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <form onSubmit={handleSubmitConcessionRequest} className="bg-white p-4 rounded border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Request Student Fee Concession</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={concessionStudentId}
                    onChange={(e) => setConcessionStudentId(e.target.value)}
                    placeholder="Student UUID"
                    className="w-full border rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Charge ID *</label>
                  <input
                    type="text"
                    required
                    value={concessionChargeId}
                    onChange={(e) => setConcessionChargeId(e.target.value)}
                    placeholder="Charge UUID"
                    className="w-full border rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Calculation Type</label>
                  <select
                    value={concessionType}
                    onChange={(e) => setConcessionType(e.target.value as any)}
                    className="w-full border rounded px-2 py-1.5 bg-white"
                  >
                    <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {concessionType === 'PERCENTAGE' ? 'Percentage (%) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={concessionValue}
                    onChange={(e) => setConcessionValue(e.target.value)}
                    placeholder={concessionType === 'PERCENTAGE' ? 'e.g. 25' : 'e.g. 500.00'}
                    className="w-full border rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Scheme Name *</label>
                  <input
                    type="text"
                    required
                    value={concessionScheme}
                    onChange={(e) => setConcessionScheme(e.target.value)}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reason *</label>
                  <input
                    type="text"
                    required
                    value={concessionReason}
                    onChange={(e) => setConcessionReason(e.target.value)}
                    placeholder="Scholarship / Sibling"
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold w-full"
              >
                Submit Concession Request
              </button>
            </form>

            <form onSubmit={handleSubmitReversalRequest} className="bg-white p-4 rounded border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Submit Payment Reversal Request</h3>
              <div>
                <label className="block font-semibold mb-1">Payment ID *</label>
                <input
                  type="text"
                  required
                  value={paymentIdInput}
                  onChange={(e) => setPaymentIdInput(e.target.value)}
                  placeholder="UUID of committed payment"
                  className="w-full border rounded px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Mandatory Reason (min 10 chars) *</label>
                <input
                  type="text"
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Explain why this transaction must be reversed..."
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold w-full"
              >
                Submit Reversal Request
              </button>
            </form>

            <form onSubmit={handleSubmitRefundRequest} className="bg-white p-4 rounded border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Submit Refund Request</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Payment ID *</label>
                  <input
                    type="text"
                    required
                    value={refundPaymentId}
                    onChange={(e) => setRefundPaymentId(e.target.value)}
                    placeholder="Payment UUID"
                    className="w-full border rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Refund Amount (₹) *</label>
                  <input
                    type="text"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="e.g. 500.00"
                    className="w-full border rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full border rounded px-2.5 py-1.5 bg-white"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reason *</label>
                  <input
                    type="text"
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Reason for refund"
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="bg-svss-navy hover:bg-blue-900 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold w-full"
              >
                Submit Refund Request
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 bg-white rounded border text-slate-500">Loading approval queues...</div>
        ) : isError ? (
          <div role="alert" className="p-4 bg-red-50 border border-red-300 rounded text-red-800">
            Failed to load approval requests: {(error as Error)?.message}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reversal Requests Table */}
            <div className="bg-white p-4 rounded border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Payment Reversal Requests</h3>
              {reversals.length === 0 ? (
                <div className="text-slate-500 py-2">No payment reversal requests found.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="p-2 text-left">Receipt / Student</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Reason</th>
                      <th className="p-2 text-left">Requested By</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reversals.map((r: any) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="p-2">
                          <div className="font-mono font-bold text-svss-navy">{r.originalReceipt}</div>
                          <div className="text-slate-500">{r.payment?.student?.fullName}</div>
                        </td>
                        <td className="p-2 text-right font-mono font-bold">{formatRupees(r.reversedAmount)}</td>
                        <td className="p-2">{r.reason}</td>
                        <td className="p-2">{r.requestedBy?.fullName} ({formatISTDate(r.requestedAt)})</td>
                        <td className="p-2 text-center font-semibold">{r.status}</td>
                        <td className="p-2 text-right space-x-2">
                          {r.status === 'PENDING' && hasPermission('REVERSAL_APPROVE') && r.requestedById !== user?.id ? (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReviewReversal(r.id, 'APPROVED')}
                                className="bg-emerald-700 text-white px-2.5 py-1 rounded font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReviewReversal(r.id, 'REJECTED')}
                                className="bg-red-700 text-white px-2.5 py-1 rounded font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          ) : r.status === 'PENDING' && r.requestedById === user?.id ? (
                            <span className="text-amber-700 italic">Awaiting dual-control approver</span>
                          ) : (
                            <span className="text-slate-500">{r.approvedBy?.fullName || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Concession Requests Table */}
            <div className="bg-white p-4 rounded border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Concession Requests</h3>
              {concessions.length === 0 ? (
                <div className="text-slate-500 py-2">No concession requests found.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="p-2 text-left">Student &amp; Fee Head</th>
                      <th className="p-2 text-left">Scheme &amp; Reason</th>
                      <th className="p-2 text-right">Approved Amount</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concessions.map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="p-2">
                          <div className="font-semibold">{c.student?.fullName} ({c.student?.admissionNumber})</div>
                          <div className="text-slate-500">{c.studentCharge?.feeHead?.name}</div>
                        </td>
                        <td className="p-2">{c.schemeName} — {c.reason}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatRupees(c.approvedAmount)}</td>
                        <td className="p-2 text-center font-semibold">{c.status}</td>
                        <td className="p-2 text-right space-x-2">
                          {c.status === 'PENDING' && hasPermission('CONCESSION_APPROVE') ? (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReviewConcession(c.id, 'APPROVED')}
                                className="bg-emerald-700 text-white px-2.5 py-1 rounded font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReviewConcession(c.id, 'REJECTED')}
                                className="bg-red-700 text-white px-2.5 py-1 rounded font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-500">{c.approvedBy?.fullName || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Refund Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Refund Requests</h3>
                {refunds.length === 0 ? (
                  <div className="text-slate-500 py-2">No refund requests found.</div>
                ) : (
                  <div className="space-y-2">
                    {refunds.map((rf: any) => (
                      <div key={rf.id} className="p-2.5 border rounded flex items-center justify-between">
                        <div>
                          <div className="font-bold">
                            {rf.payment?.receipt?.receiptNumber || rf.paymentId} — {formatRupees(rf.refundAmount)} ({rf.refundMethod})
                          </div>
                          <div className="text-slate-500">Reason: {rf.reason} • Status: {rf.status}</div>
                        </div>
                        {rf.status === 'PENDING' && hasPermission('REVERSAL_APPROVE') && rf.requestedById !== user?.id && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReviewRefund(rf.id, 'APPROVED')}
                              className="bg-emerald-700 text-white px-2.5 py-1 rounded font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReviewRefund(rf.id, 'REJECTED')}
                              className="bg-red-700 text-white px-2.5 py-1 rounded font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
