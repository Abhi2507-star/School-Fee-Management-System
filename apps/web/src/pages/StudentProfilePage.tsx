/**
 * 9-Tab Student Profile & Financial Ledger Screen
 * Tabs:
 * 1. Overview
 * 2. Academic History
 * 3. Fee Structure
 * 4. Outstanding Fees
 * 5. Payment History
 * 6. Receipts
 * 7. Concessions
 * 8. Adjustments & Refunds
 * 9. Audit History (Authorized Staff)
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { apiRequest } from '../services/api';
import { formatRupees, formatISTDate } from '../utils/format';
import { useAuth } from '../hooks/useAuth';

const TABS = [
  'Overview',
  'Academic History',
  'Fee Structure',
  'Outstanding Fees',
  'Payment History',
  'Receipts',
  'Concessions',
  'Adjustments & Refunds',
  'Audit History',
] as const;

export const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview');

  // Edit profile state (Problem 3)
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianRel, setEditGuardianRel] = useState('');
  const [editPrimaryPhone, setEditPrimaryPhone] = useState('');
  const [editSecondaryPhone, setEditSecondaryPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editUsesTransport, setEditUsesTransport] = useState(false);
  const [editTransportRoute, setEditTransportRoute] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => apiRequest<any>(`/students/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <AdminLayout title="Student Record" breadcrumbs={['Students', 'Profile']}>
        <div className="p-6 bg-white rounded border text-xs text-slate-600">
          Loading student profile and 9-tab ledger...
        </div>
      </AdminLayout>
    );
  }

  if (isError || !data) {
    return (
      <AdminLayout title="Student Record" breadcrumbs={['Students', 'Profile']}>
        <div role="alert" className="p-6 bg-red-50 border border-red-300 rounded text-xs text-red-800">
          Failed to load student record: {(error as Error)?.message || 'Student not found.'}
        </div>
      </AdminLayout>
    );
  }

  const { student, ledger, feeStructures = [], auditHistory = [] } = data;
  const enrollments = student.enrollments || [];
  const payments = student.payments || [];
  const receipts = student.receipts || [];
  const concessions = student.concessions || [];
  const credits = student.studentCredits || [];
  const allReversals = payments.flatMap((p: any) =>
    (p.reversals || []).map((r: any) => ({ ...r, receiptNumber: p.receipt?.receiptNumber }))
  );
  const allRefunds = payments.flatMap((p: any) =>
    (p.refunds || []).map((rf: any) => ({ ...rf, receiptNumber: p.receipt?.receiptNumber }))
  );
  const chargeAdjustments = (ledger.charges || []).filter((c: any) => Number(c.adjustmentAmount) !== 0);

  const openEditForm = () => {
    setEditFullName(student.fullName || '');
    setEditGuardianName(student.guardianName || '');
    setEditGuardianRel(student.guardianRelationship || 'Father');
    setEditPrimaryPhone(student.primaryContactNumber || '');
    setEditSecondaryPhone(student.secondaryContactNumber || '');
    setEditAddress(student.address || '');
    setEditUsesTransport(Boolean(student.usesTransport));
    setEditTransportRoute(student.transportRoute || '');
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingEdit || !id) return;
    if (!editFullName.trim() || !editGuardianName.trim() || !editPrimaryPhone.trim() || !editAddress.trim()) {
      setEditError('Full name, guardian name, primary contact number, and address are required.');
      return;
    }
    setEditError('');
    setIsSavingEdit(true);
    try {
      await apiRequest(`/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFullName.trim(),
          guardianName: editGuardianName.trim(),
          guardianRelationship: editGuardianRel.trim() || 'Father',
          primaryContactNumber: editPrimaryPhone.trim(),
          secondaryContactNumber: editSecondaryPhone.trim() || undefined,
          address: editAddress.trim(),
          usesTransport: editUsesTransport,
          transportRoute: editUsesTransport ? editTransportRoute.trim() : undefined,
        }),
      });
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['student', id] });
      await queryClient.invalidateQueries({ queryKey: ['students'] });
    } catch (err: any) {
      setEditError(err.message || 'Failed to update student record.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <AdminLayout
      title={`${student.fullName} (${student.admissionNumber})`}
      breadcrumbs={['Students', student.admissionNumber]}
      actions={
        hasPermission('STUDENT_WRITE') ? (
          <button
            type="button"
            onClick={openEditForm}
            className="bg-svss-navy hover:bg-blue-900 text-white px-3 py-1.5 rounded text-xs font-semibold"
          >
            Edit Student Profile
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Summary Banner */}
        <div className="bg-white p-4 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">
              Guardian: {student.guardianName} ({student.primaryContactNumber})
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">
              Status:{' '}
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs">
                {student.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-xs text-slate-500">Net Payable Charges</div>
              <div className="text-base font-bold text-slate-800">{formatRupees(ledger.totalNetPayableCharges)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Cleared Paid</div>
              <div className="text-base font-bold text-emerald-700">{formatRupees(ledger.totalClearedCollections)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Calculated Outstanding</div>
              <div className="text-lg font-extrabold text-svss-saffron">{formatRupees(ledger.totalOutstandingBalance)}</div>
            </div>
          </div>
        </div>

        {/* Inline Edit Drawer (Problem 3) */}
        {isEditing && (
          <form onSubmit={handleSaveEdit} className="bg-white p-4 rounded border-2 border-svss-navy space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-svss-navy">Edit Student Profile ({student.admissionNumber})</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-500 hover:text-slate-800 font-semibold"
              >
                Cancel
              </button>
            </div>
            {editError && (
              <div role="alert" className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded">
                {editError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Guardian Name *</label>
                <input
                  type="text"
                  required
                  value={editGuardianName}
                  onChange={(e) => setEditGuardianName(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Guardian Relationship *</label>
                <input
                  type="text"
                  required
                  value={editGuardianRel}
                  onChange={(e) => setEditGuardianRel(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Primary Contact Number *</label>
                <input
                  type="text"
                  required
                  value={editPrimaryPhone}
                  onChange={(e) => setEditPrimaryPhone(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Secondary Contact Number</label>
                <input
                  type="text"
                  value={editSecondaryPhone}
                  onChange={(e) => setEditSecondaryPhone(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  id="edit-uses-transport"
                  type="checkbox"
                  checked={editUsesTransport}
                  onChange={(e) => setEditUsesTransport(e.target.checked)}
                />
                <label htmlFor="edit-uses-transport" className="font-semibold">
                  Uses School Transport
                </label>
              </div>
              {editUsesTransport && (
                <div>
                  <label className="block font-semibold mb-1">Transport Route</label>
                  <input
                    type="text"
                    value={editTransportRoute}
                    onChange={(e) => setEditTransportRoute(e.target.value)}
                    className="w-full border rounded px-2.5 py-1.5"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isSavingEdit}
                className="bg-svss-saffron hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold"
              >
                {isSavingEdit ? 'Saving Changes...' : 'Save Student Changes'}
              </button>
            </div>
          </form>
        )}

        {/* 9-Tab Navigation */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-3 pt-2 rounded-t">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-svss-saffron text-svss-navy'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Body — All 9 Tabs Implemented with Real Backend Data & Empty States */}
        <div className="bg-white p-4 rounded-b border border-t-0 border-slate-200 text-xs">
          {/* TAB 1: Overview */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><strong>Admission Number:</strong> {student.admissionNumber}</div>
              <div><strong>Full Name:</strong> {student.fullName}</div>
              <div><strong>Date of Birth:</strong> {formatISTDate(student.dateOfBirth)}</div>
              <div><strong>Gender:</strong> {student.gender || 'Not specified'}</div>
              <div><strong>Guardian:</strong> {student.guardianName} ({student.guardianRelationship})</div>
              <div><strong>Primary Phone:</strong> {student.primaryContactNumber}</div>
              <div><strong>Secondary Phone:</strong> {student.secondaryContactNumber || '—'}</div>
              <div><strong>Admission Date:</strong> {formatISTDate(student.admissionDate)}</div>
              <div><strong>Address:</strong> {student.address}</div>
              <div><strong>Transport Opted:</strong> {student.usesTransport ? `Yes (${student.transportRoute || 'Standard Route'})` : 'No'}</div>
              <div><strong>Available Advance Credit:</strong> {formatRupees(ledger.availableAdvanceCredit)}</div>
              {student.restrictedNotes !== undefined && (
                <div><strong>Administrative Notes:</strong> {student.restrictedNotes || 'None'}</div>
              )}
            </div>
          )}

          {/* TAB 2: Academic History */}
          {activeTab === 'Academic History' && (
            <div>
              {enrollments.length === 0 ? (
                <div className="text-slate-500 py-4">No enrollment history found for this student.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="p-2 text-left">Academic Session</th>
                      <th className="p-2 text-left">Class & Section</th>
                      <th className="p-2 text-left">Roll No</th>
                      <th className="p-2 text-left">Admission Type</th>
                      <th className="p-2 text-left">Enrolled Date</th>
                      <th className="p-2 text-center">Enrollment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr: any) => (
                      <tr key={enr.id} className="border-b border-slate-100">
                        <td className="p-2 font-semibold text-svss-navy">
                          {enr.academicYear?.code} ({enr.academicYear?.name})
                        </td>
                        <td className="p-2">
                          {enr.schoolClass?.name} — Section {enr.section?.name}
                        </td>
                        <td className="p-2">{enr.rollNumber || '—'}</td>
                        <td className="p-2">{enr.isNewAdmission ? 'New Admission' : 'Promoted / Continuing'}</td>
                        <td className="p-2">{formatISTDate(enr.enrolledAt)}</td>
                        <td className="p-2 text-center font-semibold">{enr.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: Fee Structure */}
          {activeTab === 'Fee Structure' && (
            <div className="space-y-4">
              {feeStructures.length === 0 ? (
                <div className="text-slate-500 py-4">
                  No class fee structure configured for this student's enrolled class and session yet.
                </div>
              ) : (
                feeStructures.map((fs: any) => (
                  <div key={fs.id} className="border border-slate-200 rounded p-3">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <div>
                        <span className="font-bold text-svss-navy">{fs.name}</span>
                        <span className="ml-2 px-2 py-0.5 rounded bg-blue-50 text-svss-navy font-semibold">
                          v{fs.version} {fs.isCurrentVersion ? '(Active)' : '(Historical)'}
                        </span>
                      </div>
                      <span className="text-slate-500">
                        Session: {fs.academicYear?.code} • Class: {fs.schoolClass?.name}
                      </span>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-slate-600 border-b">
                          <th className="py-1.5 text-left">Fee Head</th>
                          <th className="py-1.5 text-left">Frequency</th>
                          <th className="py-1.5 text-left">Due Day</th>
                          <th className="py-1.5 text-left">Applicability</th>
                          <th className="py-1.5 text-right">Configured Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(fs.items || []).map((item: any) => (
                          <tr key={item.id} className="border-b border-slate-50">
                            <td className="py-1.5 font-medium">{item.feeHead?.name}</td>
                            <td className="py-1.5">{item.frequency}</td>
                            <td className="py-1.5">Day {item.dueDayOfMonth}</td>
                            <td className="py-1.5">
                              {item.onlyForNewAdmission
                                ? 'New Admissions Only'
                                : item.onlyForTransportUsers
                                ? 'Transport Opted Only'
                                : 'All Enrolled Students'}
                            </td>
                            <td className="py-1.5 text-right font-mono">{formatRupees(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: Outstanding Fees */}
          {activeTab === 'Outstanding Fees' && (
            <div>
              {(ledger.charges || []).length === 0 ? (
                <div className="text-slate-500 py-4">No fee charges generated for this student yet.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="p-2 text-left">Fee Head</th>
                      <th className="p-2 text-left">Period</th>
                      <th className="p-2 text-left">Due Date</th>
                      <th className="p-2 text-right">Original</th>
                      <th className="p-2 text-right">Concession</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-right">Outstanding</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.charges.map((c: any) => (
                      <tr key={c.chargeId} className="border-b border-slate-100">
                        <td className="p-2 font-medium">{c.feeHeadName}</td>
                        <td className="p-2">{c.feePeriodLabel}</td>
                        <td className="p-2">{c.dueDate}</td>
                        <td className="p-2 text-right">{formatRupees(c.originalAmount)}</td>
                        <td className="p-2 text-right">{formatRupees(c.concessionAmount)}</td>
                        <td className="p-2 text-right text-emerald-700">{formatRupees(c.clearedPaidAmount)}</td>
                        <td className="p-2 text-right font-bold text-svss-saffron">{formatRupees(c.outstandingAmount)}</td>
                        <td className="p-2 text-center">{c.derivedStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 5: Payment History */}
          {activeTab === 'Payment History' && (
            <div>
              {payments.length === 0 ? (
                <div className="text-slate-500 py-4">No payments recorded for this student yet.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="p-2 text-left">Payment Date</th>
                      <th className="p-2 text-left">Receipt No</th>
                      <th className="p-2 text-left">Method & Reference</th>
                      <th className="p-2 text-left">Allocated Fee Heads</th>
                      <th className="p-2 text-right">Received</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-left">Collected By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-slate-100">
                        <td className="p-2">{formatISTDate(p.paidAt)}</td>
                        <td className="p-2 font-mono font-semibold text-svss-navy">
                          {p.receipt?.receiptNumber || '—'}
                        </td>
                        <td className="p-2">
                          {p.paymentMethod}
                          {p.transactionReference ? ` (${p.transactionReference})` : ''}
                        </td>
                        <td className="p-2">
                          {(p.allocations || [])
                            .map((a: any) => `${a.studentCharge?.feeHead?.name || 'Charge'} (${formatRupees(a.allocatedAmount)})`)
                            .join(', ') || 'Advance Credit'}
                        </td>
                        <td className="p-2 text-right font-bold">{formatRupees(p.amountReceived)}</td>
                        <td className="p-2 text-center font-semibold">{p.status}</td>
                        <td className="p-2">{p.collectedBy?.fullName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 6: Receipts */}
          {activeTab === 'Receipts' && (
            <div>
              {receipts.length === 0 ? (
                <div className="text-slate-500 py-4">No receipts issued for this student yet.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="p-2 text-left">Receipt Number</th>
                      <th className="p-2 text-left">Issued Date</th>
                      <th className="p-2 text-left">Amount in Words</th>
                      <th className="p-2 text-right">Remaining Balance Snapshot</th>
                      <th className="p-2 text-center">Reprints</th>
                      <th className="p-2 text-right">Print / Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r: any) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="p-2 font-mono font-bold text-svss-navy">
                          {r.receiptNumber}
                          {r.isCancelledByReversal && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px]">
                              CANCELLED BY REVERSAL
                            </span>
                          )}
                        </td>
                        <td className="p-2">{formatISTDate(r.issuedAt)}</td>
                        <td className="p-2 italic">{r.amountInWords}</td>
                        <td className="p-2 text-right font-mono">{formatRupees(r.remainingBalanceSnapshot)}</td>
                        <td className="p-2 text-center">{r.reprintCount}</td>
                        <td className="p-2 text-right space-x-2">
                          <a
                            href={`/api/v1/payments/${r.paymentId}/receipt?format=HTML&reprint=true&layout=A4`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-svss-navy font-semibold hover:underline"
                          >
                            A4 Reprint
                          </a>
                          <a
                            href={`/api/v1/payments/${r.paymentId}/receipt?format=PDF`}
                            className="text-svss-saffron font-semibold hover:underline"
                          >
                            PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 7: Concessions */}
          {activeTab === 'Concessions' && (
            <div>
              {concessions.length === 0 ? (
                <div className="text-slate-500 py-4">No concessions requested or granted for this student.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="p-2 text-left">Scheme / Reason</th>
                      <th className="p-2 text-left">Fee Head</th>
                      <th className="p-2 text-left">Type & Value</th>
                      <th className="p-2 text-right">Original Charge</th>
                      <th className="p-2 text-right">Approved Concession</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-left">Requested / Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concessions.map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="p-2">
                          <div className="font-semibold">{c.schemeName}</div>
                          <div className="text-slate-500">{c.reason}</div>
                        </td>
                        <td className="p-2">{c.studentCharge?.feeHead?.name || 'Charge'}</td>
                        <td className="p-2">
                          {c.concessionType === 'PERCENTAGE' ? `${c.concessionValue}%` : formatRupees(c.concessionValue)}
                        </td>
                        <td className="p-2 text-right font-mono">{formatRupees(c.originalCharge)}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700">
                          {formatRupees(c.approvedAmount)}
                        </td>
                        <td className="p-2 text-center font-semibold">{c.status}</td>
                        <td className="p-2">
                          Req: {c.requestedBy?.fullName || '—'}
                          {c.approvedBy ? ` | Appr: ${c.approvedBy.fullName}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 8: Adjustments & Refunds */}
          {activeTab === 'Adjustments & Refunds' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Available Advance Credits</h4>
                {credits.length === 0 ? (
                  <div className="text-slate-500">No active advance credits on this account.</div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b">
                        <th className="p-2 text-left">Reason</th>
                        <th className="p-2 text-right">Original Credit</th>
                        <th className="p-2 text-right">Remaining Credit</th>
                        <th className="p-2 text-left">Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credits.map((cr: any) => (
                        <tr key={cr.id} className="border-b border-slate-100">
                          <td className="p-2">{cr.reason}</td>
                          <td className="p-2 text-right font-mono">{formatRupees(cr.originalAmount)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">
                            {formatRupees(cr.remainingAmount)}
                          </td>
                          <td className="p-2">{formatISTDate(cr.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Payment Refunds & Reversals</h4>
                {allRefunds.length === 0 && allReversals.length === 0 && chargeAdjustments.length === 0 ? (
                  <div className="text-slate-500">No refunds, payment reversals, or charge adjustments recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {allReversals.map((rev: any) => (
                      <div key={rev.id} className="p-2.5 border border-red-200 bg-red-50/50 rounded flex justify-between">
                        <div>
                          <span className="font-bold text-red-800">[REVERSAL - {rev.status}]</span>{' '}
                          Receipt {rev.originalReceipt || rev.receiptNumber}: {formatRupees(rev.reversedAmount)} — Reason: {rev.reason}
                        </div>
                        <span className="text-slate-500">{formatISTDate(rev.requestedAt)}</span>
                      </div>
                    ))}
                    {allRefunds.map((rf: any) => (
                      <div key={rf.id} className="p-2.5 border border-amber-200 bg-amber-50/50 rounded flex justify-between">
                        <div>
                          <span className="font-bold text-amber-900">[REFUND - {rf.status}]</span>{' '}
                          Receipt {rf.receiptNumber || 'N/A'}: {formatRupees(rf.refundAmount)} ({rf.refundMethod}) — Reason: {rf.reason}
                        </div>
                        <span className="text-slate-500">{formatISTDate(rf.requestedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: Audit History (Authorized Staff) */}
          {activeTab === 'Audit History' && (
            <div>
              {!hasPermission('AUDIT_LOG_VIEW') ? (
                <div className="text-slate-500 py-4">
                  Audit history is restricted to authorized Administrator and Auditor roles.
                </div>
              ) : auditHistory.length === 0 ? (
                <div className="text-slate-500 py-4">No audit events recorded for this student yet.</div>
              ) : (
                <div className="space-y-2">
                  {auditHistory.map((log: any) => (
                    <div key={log.id} className="p-2 border border-slate-200 rounded flex justify-between">
                      <span>
                        <strong>{log.action}:</strong> {log.summary}
                      </span>
                      <span className="text-slate-500">
                        {log.actorUsername} • {formatISTDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
