import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAcademicSession } from '../hooks/useAcademicSession';
import { apiRequest } from '../services/api';
import { formatRupees, formatISTDate } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { getPermittedReportsForRole } from '../utils/workflows';

const EXCEL_EXPORTS = [
  { id: 'student-register', title: 'A. Complete Student Register (.xlsx)', desc: 'Admission No, Name, Class, Section, Status, Net Charges, Valid Payments, Outstanding Balance' },
  { id: 'daily-collection', title: 'B. Daily Collection Register (.xlsx)', desc: 'Receipt No, Payment Date, Student, Class, Fee Heads, Mode, Ref, Amount, Cashier, Status' },
  { id: 'class-wise-fee', title: 'C. Class-Wise Fee Report (.xlsx)', desc: 'Class & Section, Student Count, Fees Charged, Concessions, Cleared Collections, Outstanding' },
  { id: 'outstanding-dues', title: 'D. Outstanding Dues & Defaulter Report (.xlsx)', desc: 'Student, Class, Fee Head, Period, Due Date, Original Charge, Adjustments, Paid, Outstanding, Days Overdue' },
  { id: 'student-payment-history', title: 'E. Student Payment History (.xlsx)', desc: 'Payment Date, Receipt No, Periods Covered, Mode, Amount, Allocations, Remaining Balance' },
  { id: 'fee-head-collection', title: 'F. Fee-Head Collection Report (.xlsx)', desc: 'Fee Category, Amount Billed, Amount Collected, Outstanding Amount for Date Range' },
  { id: 'cashier-collection', title: 'G. Cashier Collection Report (.xlsx)', desc: 'Cashier, Payment Count, Cash Collection, Non-Cash by Method, Refunds, Reversals, Net Collection' },
];

const LIVE_REPORTS = [
  { id: '1', label: '1. Daily Collection Register' },
  { id: '2', label: '2. Monthly Collection Report' },
  { id: '3', label: '3. Academic-Year Financial Summary' },
  { id: '4', label: '4. Class-Wise Collection Report' },
  { id: '5', label: '5. Fee-Head Collection Report' },
  { id: '6', label: '6. Outstanding Dues Report' },
  { id: '7', label: '7. Defaulter Report (Overdue Installments)' },
  { id: '8', label: '8. Student Ledger Summary' },
  { id: '9', label: '9. Payment & Receipt Register' },
  { id: '10', label: '10. Cashier-Wise Collection Report' },
  { id: '11', label: '11. Concession Report' },
  { id: '12', label: '12. Refund & Reversal Report' },
  { id: '13', label: '13. Audit Log Report' },
];

export const ReportsAndExportsPage: React.FC = () => {
  const { selectedAcademicYearId, selectedAcademicYear } = useAcademicSession();
  const { user, hasPermission } = useAuth();
  const permittedMeta = getPermittedReportsForRole(user?.roles || []);
  const permittedReportIds = Array.isArray(permittedMeta) ? permittedMeta : permittedMeta.allowedReportIds;
  const visibleLiveReports = LIVE_REPORTS.filter((r) => permittedReportIds.includes(r.id));
  const [selectedReportId, setSelectedReportId] = useState('1');
  const querySuffix = selectedAcademicYearId ? `?academicYearId=${encodeURIComponent(selectedAcademicYearId)}` : '';

  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['reports-collections', selectedAcademicYearId],
    queryFn: () => apiRequest<any>(`/reports/collections${querySuffix}`),
    enabled: ['1', '2', '9', '10'].includes(selectedReportId),
  });

  const { data: outstandingData, isLoading: isLoadingOutstanding } = useQuery({
    queryKey: ['reports-outstanding', selectedAcademicYearId, selectedReportId === '7'],
    queryFn: () =>
      apiRequest<any>(
        `/reports/outstanding?${new URLSearchParams({
          ...(selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}),
          ...(selectedReportId === '7' ? { onlyOverdue: 'true' } : {}),
        }).toString()}`
      ),
    enabled: ['6', '7'].includes(selectedReportId),
  });

  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['reports-dashboard-summary', selectedAcademicYearId],
    queryFn: () => apiRequest<any>(`/reports/dashboard${querySuffix}`),
    enabled: ['3', '4', '5', '8'].includes(selectedReportId),
  });

  const { data: approvalsData, isLoading: isLoadingApprovals } = useQuery({
    queryKey: ['reports-approvals', selectedAcademicYearId],
    queryFn: () => apiRequest<any>(`/approvals${querySuffix}`),
    enabled: ['11', '12'].includes(selectedReportId),
  });

  const { data: auditData, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['reports-audit'],
    queryFn: () => apiRequest<any>('/audit-logs'),
    enabled: selectedReportId === '13',
  });

  const isLoadingReport =
    isLoadingCollections ||
    isLoadingOutstanding ||
    isLoadingDashboard ||
    isLoadingApprovals ||
    isLoadingAudit;

  return (
    <AdminLayout
      title={`14 Financial Reports & 7 Offline Spreadsheet (.xlsx) Exports (${selectedAcademicYear?.code || 'All'})`}
      breadcrumbs={['Reports & Exports', selectedAcademicYear?.code || 'Session']}
    >
      <div className="space-y-6">
        {hasPermission('REPORT_EXPORT') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXCEL_EXPORTS.map((exp) => (
            <div key={exp.id} className="bg-white p-3.5 rounded border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-svss-navy">{exp.title}</h3>
                <p className="text-[11px] text-slate-600 mt-1">{exp.desc}</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                <a
                  href={`/api/v1/exports/${exp.id}${querySuffix}`}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded text-xs font-bold"
                >
                  Download .XLSX ({selectedAcademicYear?.code || 'All'})
                </a>
              </div>
            </div>
          ))}
        </div>

        )}

        {/* Interactive Report Inspector */}
        <div className="bg-white p-4 rounded border border-slate-200 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 no-print">
            <div className="flex items-center gap-2">
              <label htmlFor="live-report-select" className="font-bold text-slate-700">
                Inspect Live Report (1–14):
              </label>
              <select
                id="live-report-select"
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white font-semibold text-slate-900"
              >
                {visibleLiveReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-svss-navy hover:bg-blue-900 text-white px-3.5 py-1.5 rounded font-bold"
            >
              Print / Save PDF Report
            </button>
          </div>

          {isLoadingReport ? (
            <div className="p-6 text-center text-slate-500">Loading report data for {selectedAcademicYear?.code || 'active session'}...</div>
          ) : ['1', '2', '9'].includes(selectedReportId) ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-700">
                    <th className="p-2 text-left whitespace-nowrap">Receipt No</th>
                    <th className="p-2 text-left whitespace-nowrap">Date</th>
                    <th className="p-2 text-left whitespace-nowrap">Student &amp; Adm No</th>
                    <th className="p-2 text-left whitespace-nowrap">Method</th>
                    <th className="p-2 text-left whitespace-nowrap">Cashier</th>
                    <th className="p-2 text-right whitespace-nowrap">Amount</th>
                    <th className="p-2 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(collectionsData?.payments || []).map((p: any) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="p-2 font-mono font-bold text-svss-navy whitespace-nowrap">{p.receipt?.receiptNumber}</td>
                      <td className="p-2 whitespace-nowrap">{formatISTDate(p.paidAt)}</td>
                      <td className="p-2 whitespace-nowrap">{p.student?.fullName} ({p.student?.admissionNumber})</td>
                      <td className="p-2 whitespace-nowrap">{p.paymentMethod}</td>
                      <td className="p-2 whitespace-nowrap">{p.collectedBy?.fullName}</td>
                      <td className="p-2 text-right font-mono tabular-nums font-bold whitespace-nowrap">{formatRupees(p.amountReceived)}</td>
                      <td className="p-2 text-center font-semibold whitespace-nowrap">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : selectedReportId === '10' ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-700">
                    <th className="p-2 text-left">Cashier Name</th>
                    <th className="p-2 text-right">Receipts Count</th>
                    <th className="p-2 text-right">Cash Collection</th>
                    <th className="p-2 text-right">Non-Cash Collection</th>
                    <th className="p-2 text-right">Reversals</th>
                    <th className="p-2 text-right">Net Valid Collection</th>
                  </tr>
                </thead>
                <tbody>
                  {(collectionsData?.cashierBreakdown || []).map((c: any) => (
                    <tr key={c.cashierName} className="border-b border-slate-100">
                      <td className="p-2 font-semibold">{c.cashierName}</td>
                      <td className="p-2 text-right font-mono">{c.paymentCount}</td>
                      <td className="p-2 text-right font-mono tabular-nums">{formatRupees(c.cashCollection)}</td>
                      <td className="p-2 text-right font-mono tabular-nums">{formatRupees(c.nonCashCollection)}</td>
                      <td className="p-2 text-right font-mono tabular-nums text-red-700">{formatRupees(c.reversals)}</td>
                      <td className="p-2 text-right font-mono tabular-nums font-bold text-emerald-700">{formatRupees(c.netCollection)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : ['6', '7'].includes(selectedReportId) ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-700">
                    <th className="p-2 text-left">Admission No</th>
                    <th className="p-2 text-left">Student Name</th>
                    <th className="p-2 text-left">Class</th>
                    <th className="p-2 text-left">Fee Head &amp; Period</th>
                    <th className="p-2 text-left">Due Date</th>
                    <th className="p-2 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {(outstandingData?.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="p-2 font-mono font-bold text-svss-navy">{item.admissionNumber}</td>
                      <td className="p-2 font-semibold">{item.studentName}</td>
                      <td className="p-2">{item.className}-{item.sectionName}</td>
                      <td className="p-2">{item.feeHeadName} ({item.feePeriodLabel})</td>
                      <td className="p-2 font-mono">{item.dueDate}</td>
                      <td className="p-2 text-right font-mono tabular-nums font-bold text-svss-saffron">{formatRupees(item.outstandingAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : ['11', '12'].includes(selectedReportId) ? (
            <div className="overflow-x-auto">
              {selectedReportId === '11' && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="p-2 text-left">Student</th>
                      <th className="p-2 text-left">Scheme &amp; Reason</th>
                      <th className="p-2 text-right">Approved Amount</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(approvalsData?.concessions || []).map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="p-2 font-semibold">{c.student?.fullName} ({c.student?.admissionNumber})</td>
                        <td className="p-2">{c.schemeName} — {c.reason}</td>
                        <td className="p-2 text-right font-mono tabular-nums font-bold text-emerald-700">{formatRupees(c.approvedAmount)}</td>
                        <td className="p-2 text-center font-semibold">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selectedReportId === '12' && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="p-2 text-left">Receipt / Reference</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Reason</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(approvalsData?.reversals || []).map((r: any) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="p-2 font-mono font-bold">{r.originalReceipt}</td>
                        <td className="p-2 text-right font-mono tabular-nums font-bold text-red-700">{formatRupees(r.reversedAmount)}</td>
                        <td className="p-2">{r.reason}</td>
                        <td className="p-2 text-center font-semibold">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : selectedReportId === '13' ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-700">
                    <th className="p-2 text-left">Timestamp</th>
                    <th className="p-2 text-left">Actor &amp; Role</th>
                    <th className="p-2 text-left">Action</th>
                    <th className="p-2 text-left">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditData?.logs || []).map((l: any) => (
                    <tr key={l.id} className="border-b border-slate-100">
                      <td className="p-2 whitespace-nowrap">{formatISTDate(l.createdAt)}</td>
                      <td className="p-2 whitespace-nowrap">{l.actorUsername} ({l.actorRole})</td>
                      <td className="p-2 font-mono font-bold text-svss-navy whitespace-nowrap">{l.action}</td>
                      <td className="p-2">{l.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded border">
                <div className="text-[11px] font-bold uppercase text-slate-500">Gross Fees Billed</div>
                <div className="text-base font-mono font-bold mt-1">{formatRupees(dashboardData?.metrics?.totalGrossFeesBilled || '0.00')}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded border">
                <div className="text-[11px] font-bold uppercase text-slate-500">Approved Concessions</div>
                <div className="text-base font-mono font-bold text-emerald-700 mt-1">{formatRupees(dashboardData?.metrics?.totalConcessionsGranted || '0.00')}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded border">
                <div className="text-[11px] font-bold uppercase text-slate-500">Cleared Collection</div>
                <div className="text-base font-mono font-bold text-svss-navy mt-1">{formatRupees(dashboardData?.metrics?.academicYearCollection || '0.00')}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded border">
                <div className="text-[11px] font-bold uppercase text-slate-500">Outstanding Dues</div>
                <div className="text-base font-mono font-bold text-svss-saffron mt-1">{formatRupees(dashboardData?.metrics?.totalOutstandingDues || '0.00')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
