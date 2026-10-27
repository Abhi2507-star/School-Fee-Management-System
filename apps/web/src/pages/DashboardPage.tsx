import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { apiRequest } from '../services/api';
import { formatRupees, formatISTDate } from '../utils/format';
import { useAcademicSession } from '../hooks/useAcademicSession';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { resolveTwoRoleMode } from '../utils/workflows';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedAcademicYearId, selectedAcademicYear } = useAcademicSession();
  const { lang, t } = useLanguage();

  const roleMode = resolveTwoRoleMode(user?.roles || []);
  const isAdmin = roleMode === 'ADMIN';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', selectedAcademicYearId],
    queryFn: () =>
      apiRequest<any>(
        `/reports/dashboard${selectedAcademicYearId ? `?academicYearId=${encodeURIComponent(selectedAcademicYearId)}` : ''}`
      ),
  });

  const sessionLabel = selectedAcademicYear?.code || '2026-27';

  const m = data?.metrics || {
    totalActiveStudents: 0,
    todaysValidCollection: '0.00',
    academicYearCollection: '0.00',
    totalOutstandingDues: '0.00',
  };

  // ============================================================================
  // FEE COLLECTOR DASHBOARD: Today's Collection & Recent Receipts ONLY
  // (No duplicate navigation cards — sidebar provides navigation)
  // ============================================================================
  if (!isAdmin) {
    return (
      <AdminLayout
        title={lang === 'hi' ? `फीस संग्रह मुख्य पृष्ठ (${sessionLabel})` : `Fee Collector Dashboard (${sessionLabel})`}
        breadcrumbs={[t('dashboard')]}
      >
        {isLoading ? (
          <div className="p-6 text-center text-slate-600 text-xs">{t('loading')}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Today's Collection */}
            <div className="bg-white p-4 rounded border border-slate-200 border-l-4 border-l-emerald-600">
              <div className="text-xs font-bold uppercase text-slate-500">
                {lang === 'hi' ? "आज की वसूली (Today's Collection)" : "Today's Collection"}
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-2">
                {formatRupees(m.todaysValidCollection)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {lang === 'hi'
                  ? `वसूलीकर्ता: ${user?.fullName || 'Fee Collector'}`
                  : `Collector: ${user?.fullName || 'Fee Collector'}`}
              </div>
            </div>

            {/* Recent Receipts */}
            <div className="lg:col-span-2 bg-white p-4 rounded border border-slate-200">
              <h3 className="text-xs font-extrabold uppercase text-slate-700 border-b border-slate-100 pb-2 mb-3">
                {lang === 'hi' ? 'हाल की रसीदें (Recent Receipts)' : 'Recent Receipts'}
              </h3>
              <div className="space-y-2 text-xs">
                {(data?.recentPayments || []).length === 0 ? (
                  <div className="text-slate-400 py-4 text-center">{t('noResults')}</div>
                ) : (
                  (data?.recentPayments || []).slice(0, 6).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {p.student?.fullName} ({p.student?.admissionNumber})
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {p.receipt?.receiptNumber} • {p.paymentMethod}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-emerald-700">{formatRupees(p.amountReceived)}</div>
                        <div className="text-slate-400 text-[11px]">{formatISTDate(p.paidAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    );
  }

  // ============================================================================
  // ADMIN DASHBOARD: 4 Summary Cards (Fees Received, Fees Remaining, Total Students,
  // Today's Collection) + Recent Receipts + Students with Pending Fees (No Charts)
  // ============================================================================
  return (
    <AdminLayout
      title={lang === 'hi' ? `प्रशासन मुख्य पृष्ठ (${sessionLabel})` : `Admin Dashboard (${sessionLabel})`}
      breadcrumbs={['Admin', t('dashboard'), sessionLabel]}
    >
      {isLoading ? (
        <div className="p-8 text-center text-slate-600">{t('loading')}</div>
      ) : isError ? (
        <div role="alert" className="p-4 bg-red-50 border border-red-300 rounded text-xs text-red-800">
          {(error as Error)?.message}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4 Summary Cards: Fees Received, Fees Remaining, Total Students, Today's Collection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded border border-slate-200 border-l-4 border-l-emerald-600">
              <div className="text-xs font-semibold text-slate-500">
                {lang === 'hi' ? 'प्राप्त फीस (Fees Received)' : 'Fees Received'}
              </div>
              <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                {formatRupees(m.academicYearCollection)}
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200 border-l-4 border-l-svss-saffron">
              <div className="text-xs font-semibold text-slate-500">
                {lang === 'hi' ? 'बाकी फीस (Fees Remaining)' : 'Fees Remaining'}
              </div>
              <div className="text-2xl font-bold text-svss-saffron font-mono mt-1">
                {formatRupees(m.totalOutstandingDues)}
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200 border-l-4 border-l-svss-navy">
              <div className="text-xs font-semibold text-slate-500">
                {lang === 'hi' ? 'कुल विद्यार्थी (Total Students)' : 'Total Students'}
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {m.totalActiveStudents}
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200 border-l-4 border-l-amber-500">
              <div className="text-xs font-semibold text-slate-500">
                {lang === 'hi' ? "आज की वसूली (Today's Collection)" : "Today's Collection"}
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {formatRupees(m.todaysValidCollection)}
              </div>
            </div>
          </div>

          {/* Recent Receipts & Students with Pending Fees */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                {lang === 'hi' ? 'हाल की रसीदें (Recent Receipts)' : 'Recent Receipts'}
              </h3>
              <div className="space-y-2.5 text-xs">
                {(data?.recentPayments || []).length === 0 ? (
                  <div className="text-slate-400 py-4 text-center">{t('noResults')}</div>
                ) : (
                  (data?.recentPayments || []).slice(0, 6).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {p.student?.fullName} ({p.student?.admissionNumber})
                        </div>
                        <div className="text-slate-500 font-mono">{p.receipt?.receiptNumber} • {p.paymentMethod}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-emerald-700">{formatRupees(p.amountReceived)}</div>
                        <div className="text-slate-400">{formatISTDate(p.paidAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                {lang === 'hi' ? 'बकाया फीस वाले विद्यार्थी (Students with Pending Fees)' : 'Students with Pending Fees'}
              </h3>
              <div className="space-y-2.5 text-xs">
                {(data?.studentsWithPendingFees || []).length === 0 ? (
                  <div className="text-slate-400 py-4 text-center">
                    {lang === 'hi' ? 'कोई बकाया फीस नहीं है।' : 'No students with pending fees.'}
                  </div>
                ) : (
                  (data?.studentsWithPendingFees || []).slice(0, 8).map((st: any) => (
                    <div key={st.studentId} className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {st.fullName} (<span className="font-mono">{st.admissionNumber}</span>)
                        </div>
                        <div className="text-slate-500">
                          {st.className}-{st.sectionName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-svss-saffron">{formatRupees(st.outstandingAmount)}</div>
                        <Link to={`/students/${st.studentId}`} className="text-[11px] font-semibold text-svss-navy hover:underline">
                          {lang === 'hi' ? 'खाता देखें' : 'View Ledger'}
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
