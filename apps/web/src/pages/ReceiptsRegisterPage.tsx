import React, { useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { apiRequest } from '../services/api';
import { formatRupees, formatISTDate } from '../utils/format';
import { useAcademicSession } from '../hooks/useAcademicSession';
import { useLanguage } from '../hooks/useLanguage';

export const ReceiptsRegisterPage: React.FC = () => {
  const { selectedAcademicYearId, selectedAcademicYear } = useAcademicSession();
  const { lang, t } = useLanguage();

  const [queryText, setQueryText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedPayment(null);
    setSearchError('');

    if (!queryText.trim() && !fromDate && !toDate) {
      setResults([]);
      setHasSearched(false);
      setSearchError(t('emptyReceiptSearchError'));
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (selectedAcademicYearId) params.set('academicYearId', selectedAcademicYearId);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const data = await apiRequest<any>(`/payments?${params.toString()}`);
      const q = queryText.trim().toLowerCase();
      const filtered = (data?.payments || []).filter((p: any) => {
        if (!q) return true;
        const rNo = (p.receipt?.receiptNumber || '').toLowerCase();
        const sName = (p.student?.fullName || '').toLowerCase();
        const adm = (p.student?.admissionNumber || '').toLowerCase();
        const ref = (p.transactionReference || '').toLowerCase();
        return rNo.includes(q) || sName.includes(q) || adm.includes(q) || ref.includes(q);
      });
      setResults(filtered);
    } catch (err: any) {
      setResults([]);
      setSearchError(err.message || 'Failed to search receipts.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setQueryText('');
    setFromDate('');
    setToDate('');
    setResults([]);
    setSelectedPayment(null);
    setHasSearched(false);
    setSearchError('');
  };

  return (
    <AdminLayout
      title={`${t('reprintReceipt')} (${selectedAcademicYear?.code || '2026-27'})`}
      breadcrumbs={[t('reprintReceipt')]}
    >
      <div className="space-y-4">
        <form onSubmit={handleSearch} className="bg-white p-4 rounded border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? 'रसीद संख्या / प्रवेश संख्या / विद्यार्थी का नाम' : 'Receipt No / Admission No / Student Name'}
              </label>
              <input
                type="text"
                value={queryText}
                onChange={(e) => {
                  setQueryText(e.target.value);
                  setSelectedPayment(null);
                }}
                placeholder={lang === 'hi' ? 'जैसे SVSS/2026-27/000001 या Aarav' : 'e.g. SVSS/2026-27/000001'}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? 'प्रारंभ तिथि' : 'From Date'}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? 'अंतिम तिथि' : 'To Date'}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-700"
            >
              {t('reset')}
            </button>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-svss-navy text-white px-4 py-1.5 rounded font-bold"
            >
              {isSearching ? t('loading') : t('search')}
            </button>
          </div>
        </form>

        {searchError && (
          <div role="alert" className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded font-medium">
            {searchError}
          </div>
        )}

        {hasSearched && !isSearching && results.length === 0 && !searchError && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded">
            {t('noResults')}
          </div>
        )}

        {hasSearched && results.length > 0 && (
          <div className="bg-white rounded border border-slate-200 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b">
                  <th className="p-2.5 text-left">{lang === 'hi' ? 'रसीद संख्या' : 'Receipt No'}</th>
                  <th className="p-2.5 text-left">{lang === 'hi' ? 'तारीख' : 'Date'}</th>
                  <th className="p-2.5 text-left">{t('studentName')}</th>
                  <th className="p-2.5 text-left">{t('paymentMethod')}</th>
                  <th className="p-2.5 text-right">{t('amountToPay')}</th>
                  <th className="p-2.5 text-right">{lang === 'hi' ? 'चयन करें' : 'Select'}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p: any) => {
                  const isSel = selectedPayment?.id === p.id;
                  return (
                    <tr key={p.id} className={`border-b border-slate-100 ${isSel ? 'bg-blue-50' : ''}`}>
                      <td className="p-2.5 font-mono font-bold text-svss-navy">{p.receipt?.receiptNumber}</td>
                      <td className="p-2.5">{formatISTDate(p.paidAt)}</td>
                      <td className="p-2.5">{p.student?.fullName} ({p.student?.admissionNumber})</td>
                      <td className="p-2.5">{p.paymentMethod}</td>
                      <td className="p-2.5 text-right font-bold">{formatRupees(p.amountReceived)}</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(p)}
                          className={`px-3 py-1 rounded font-bold ${
                            isSel ? 'bg-emerald-700 text-white' : 'bg-svss-navy text-white'
                          }`}
                        >
                          {isSel
                            ? lang === 'hi'
                              ? 'चयनित ✓'
                              : 'Selected ✓'
                            : lang === 'hi'
                            ? 'रसीद चुनें'
                            : 'Select Receipt'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedPayment && (
          <div className="bg-white p-4 rounded border-2 border-svss-navy space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div>
                <span className="font-extrabold text-svss-navy text-sm font-mono">
                  {selectedPayment.receipt?.receiptNumber}
                </span>
                <span className="ml-2 text-slate-600">
                  {selectedPayment.student?.fullName} ({selectedPayment.student?.admissionNumber})
                </span>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/v1/payments/${selectedPayment.id}/receipt?format=HTML&reprint=true&layout=A4`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-svss-navy text-white px-3.5 py-1.5 rounded font-bold"
                >
                  {t('printReceipt')} (A4)
                </a>
                <a
                  href={`/api/v1/payments/${selectedPayment.id}/receipt?format=HTML&reprint=true&layout=THERMAL`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-svss-saffron text-white px-3.5 py-1.5 rounded font-bold"
                >
                  {t('printReceipt')} (80mm Thermal)
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
