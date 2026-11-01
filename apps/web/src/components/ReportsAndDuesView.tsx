import React, { useState, useEffect } from 'react';
import { ReportSummary, DefaulterStudent } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { CLASSES_LIST, COMMON_VILLAGES, formatDateIndian } from '../utils/constants';
import { apiRequest } from '../services/api';
import { Trash2, AlertTriangle, Calendar, Users, TrendingUp, MessageSquare, UserMinus, UserCheck } from 'lucide-react';

export const ReportsAndDuesView: React.FC = () => {
  const { lang, t } = useLanguage();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedVillage, setSelectedVillage] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'LEFT' | 'ALL'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const loadSummary = async () => {
    try {
      const res = await apiRequest<ReportSummary>('/reports/summary');
      setSummary(res);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadDefaulters = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.set('class_name', selectedClass);
      if (selectedVillage) params.set('village', selectedVillage);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiRequest<{ defaulters: DefaulterStudent[] }>(
        `/reports/defaulters?${params.toString()}`
      );
      setDefaulters(res.defaulters || []);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([loadSummary(), loadDefaulters()]).finally(() => setLoading(false));
  }, [selectedClass, selectedVillage, statusFilter]);

  const handleDeletePayment = async (paymentId: number) => {
    if (
      !window.confirm(
        lang === 'hi'
          ? 'क्या आप सच में यह भुगतान प्रविष्टि हटाना चाहते हैं? यह शुल्क पुनः बाकी हो जाएगा।'
          : 'Are you sure you want to delete this payment entry? The fee will return to unpaid status.'
      )
    ) {
      return;
    }

    setDeletingId(paymentId);
    setMsg('');
    try {
      await apiRequest(`/payments/${paymentId}`, { method: 'DELETE' });
      setMsg(lang === 'hi' ? 'भुगतान प्रविष्टि सफलतापूर्वक हटा दी गई।' : 'Payment entry deleted.');
      await Promise.all([loadSummary(), loadDefaulters()]);
    } catch (e: any) {
      alert(e.message || 'Error deleting payment');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold">
        {lang === 'hi' ? 'लोड हो रहा है...' : 'Loading reports...'}
      </div>
    );
  }

  const totalDuesCalculated = defaulters.reduce((sum, d) => sum + d.total_due, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
            <span>{t('todayCollection')}</span>
            <Calendar size={18} />
          </div>
          <div className="text-2xl font-black font-mono mt-1">₹{summary?.today_total || 0}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
            <span>{t('monthCollection')}</span>
            <TrendingUp size={18} />
          </div>
          <div className="text-2xl font-black font-mono mt-1">₹{summary?.month_total || 0}</div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
            <span>{t('totalStudents')}</span>
            <Users size={18} />
          </div>
          <div className="text-2xl font-black font-mono mt-1 flex items-baseline gap-2">
            <span>{summary?.total_active || summary?.total_students || 0}</span>
            <span className="text-xs opacity-75 font-normal">
              ({summary?.total_left || 0} {lang === 'hi' ? 'स्कूल छोड़े' : 'Left'})
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-700 to-red-800 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
            <span>{t('totalDues')}</span>
            <AlertTriangle size={18} />
          </div>
          <div className="text-2xl font-black font-mono mt-1">₹{totalDuesCalculated}</div>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl">
          {msg}
        </div>
      )}

      {/* Defaulter / Pending Dues List with WhatsApp Reminders */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span>{lang === 'hi' ? 'बकाया फीस सूची एवं व्हाट्सएप संदेश' : 'Pending Fee Dues & WhatsApp Reminders'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'hi'
                ? 'जिन बच्चों की फीस बाकी है, उन्हें सीधे 1-क्लिक में व्हाट्सएप पर बकाया सूचना भेजें।'
                : 'Send 1-click polite payment reminders directly to parents on WhatsApp.'}
            </p>
          </div>

          {/* Filters: Class, Village & Status */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white"
            >
              <option value="ACTIVE">{lang === 'hi' ? 'पढ़ रहे बच्चे (Active)' : 'Active Students'}</option>
              <option value="LEFT">{lang === 'hi' ? 'स्कूल छोड़ चुके बच्चे (TC)' : 'Left Students / TC'}</option>
              <option value="ALL">{lang === 'hi' ? 'सभी बच्चे (All)' : 'All Students'}</option>
            </select>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white"
            >
              <option value="">{lang === 'hi' ? 'सभी कक्षाएं (All Classes)' : 'All Classes'}</option>
              {CLASSES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Village Filter */}
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white"
            >
              <option value="">{lang === 'hi' ? 'सभी गाँव (All Villages)' : 'All Villages'}</option>
              {COMMON_VILLAGES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Defaulters Table */}
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b z-10 text-slate-700 font-extrabold">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">{t('rollNo')}</th>
                <th className="py-2.5 px-3 text-left">{t('studentName')}</th>
                <th className="py-2.5 px-3 text-left">{t('fatherName')}</th>
                <th className="py-2.5 px-3 text-left">{lang === 'hi' ? 'कक्षा' : 'Class'}</th>
                <th className="py-2.5 px-3 text-left">{t('village')}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'hi' ? 'पिछला बकाया' : 'Old Due'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'hi' ? 'चालू बकाया' : 'Current Due'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'hi' ? 'कुल बकाया' : 'Total Due'}</th>
                <th className="py-2.5 px-3 text-center">{lang === 'hi' ? 'व्हाट्सएप भेजें' : 'WhatsApp'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {defaulters.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">#{d.roll_no}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{d.student_name}</span>
                      {d.status === 'LEFT' && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.2 rounded">
                          {lang === 'hi' ? 'TC' : 'LEFT'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{d.father_name}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{d.class_name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{d.village}</td>

                  {/* Previous Class Due */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    {d.previous_class_due > 0 ? (
                      <span className="text-red-700">₹{d.previous_class_due}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Current Class Due */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                    ₹{d.current_class_due}
                  </td>

                  {/* Total Due */}
                  <td className="py-2.5 px-3 text-right font-mono font-black text-red-700 text-sm">
                    ₹{d.total_due}
                  </td>

                  {/* WhatsApp Action */}
                  <td className="py-2.5 px-3 text-center">
                    {d.mobile && d.whatsapp_url ? (
                      <a
                        href={d.whatsapp_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition active:scale-95"
                        title={d.whatsapp_message}
                      >
                        <MessageSquare size={13} />
                        <span>{lang === 'hi' ? 'व्हाट्सएप' : 'WhatsApp'}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {defaulters.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-emerald-700 font-bold">
                    ✓ {lang === 'hi' ? 'सभी बच्चों की फीस चुकता है!' : 'All student dues are cleared!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payments Log with Option to Delete/Correct Mistaken Entry */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            {lang === 'hi' ? 'हालिया जमा फीस लॉग (Recent Payments Entry Log)' : 'Recent Payments Entry Log'}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === 'hi'
              ? 'यदि किसी बच्चे की फीस गलती से दर्ज हो गई है, तो यहाँ से हटाएं (Delete) कर पुनः बाकी करें।'
              : 'Mistaken entries can be deleted here to return the head to unpaid status.'}
          </p>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b z-10 text-slate-700 font-extrabold">
              <tr>
                <th className="py-2 px-3 text-left">{t('receiptNo')}</th>
                <th className="py-2 px-3 text-left">{t('date')}</th>
                <th className="py-2 px-3 text-left">{t('studentName')}</th>
                <th className="py-2 px-3 text-left">{lang === 'hi' ? 'कक्षा' : 'Class'}</th>
                <th className="py-2 px-3 text-left">{lang === 'hi' ? 'मद (Head)' : 'Head'}</th>
                <th className="py-2 px-3 text-right">{lang === 'hi' ? 'राशि' : 'Amount'}</th>
                <th className="py-2 px-3 text-left">{lang === 'hi' ? 'जमाकर्ता' : 'By'}</th>
                <th className="py-2 px-3 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(summary?.recent_payments || []).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-bold text-emerald-800">{p.receipt_no}</td>
                  <td className="py-2 px-3 text-slate-600">{formatDateIndian(p.payment_date)}</td>
                  <td className="py-2 px-3 font-bold text-slate-900">{p.student?.student_name}</td>
                  <td className="py-2 px-3 text-slate-700">{p.student?.class_name}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{p.fee_head}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">₹{p.amount_paid}</td>
                  <td className="py-2 px-3 text-slate-500 text-[11px]">{p.collected_by}</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      disabled={deletingId === p.id}
                      className="p-1 hover:bg-red-50 text-red-600 hover:text-red-800 rounded transition"
                      title={lang === 'hi' ? 'यह प्रविष्टि हटाएं' : 'Delete Entry'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
