import React, { useState, useEffect } from 'react';
import { FeeStructure } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { apiRequest } from '../services/api';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

export const FeeStructureEditor: React.FC = () => {
  const { lang, t } = useLanguage();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingClass, setSavingClass] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadData = async () => {
    try {
      const res = await apiRequest<{ fee_structures: FeeStructure[] }>('/fee-structures');
      setStructures(res.fee_structures || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (className: string, field: keyof FeeStructure, value: number) => {
    setStructures((prev) =>
      prev.map((s) => (s.class_name === className ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async (className: string) => {
    const item = structures.find((s) => s.class_name === className);
    if (!item) return;

    setSavingClass(className);
    setMsg('');
    setErr('');

    try {
      await apiRequest(`/fee-structures/${encodeURIComponent(className)}`, {
        method: 'PUT',
        body: JSON.stringify({
          monthly_fee: item.monthly_fee,
          exam_fee: item.exam_fee,
          default_admission_fee: item.default_admission_fee,
        }),
      });
      setMsg(
        lang === 'hi'
          ? `${className} का शुल्क ढाँचा सफलतापूर्वक अपडेट किया गया।`
          : `Fee structure for ${className} saved successfully.`
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSavingClass(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">{lang === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {t('manageFees')}
          </h3>
          <p className="text-[11px] text-slate-500">
            {lang === 'hi'
              ? 'प्रत्येक कक्षा (LKG से Class 12) के लिए मासिक शुल्क, परीक्षा शुल्क व प्रवेश शुल्क निर्धारित करें।'
              : 'Configure Monthly Fee, Exam Fee, and Default Admission Fee for each class (LKG to Class 12).'}
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{err}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <th className="py-2 px-3 text-left">{lang === 'hi' ? 'कक्षा (Class)' : 'Class'}</th>
              <th className="py-2 px-3 text-right">{t('monthlyFee')} (₹)</th>
              <th className="py-2 px-3 text-right">{t('examFee')} (₹)</th>
              <th className="py-2 px-3 text-right">{t('admissionFee')} (₹)</th>
              <th className="py-2 px-3 text-center w-24">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {structures.map((s) => (
              <tr key={s.class_name} className="hover:bg-slate-50/80 transition">
                <td className="py-2 px-3 font-bold text-slate-900">
                  {s.class_name}
                </td>
                <td className="py-1.5 px-3 text-right">
                  <input
                    type="number"
                    value={s.monthly_fee}
                    onChange={(e) => handleChange(s.class_name, 'monthly_fee', Number(e.target.value))}
                    className="w-20 border border-slate-300 rounded-md px-2 py-1 text-right font-mono font-bold text-xs"
                  />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <input
                    type="number"
                    value={s.exam_fee}
                    onChange={(e) => handleChange(s.class_name, 'exam_fee', Number(e.target.value))}
                    className="w-20 border border-slate-300 rounded-md px-2 py-1 text-right font-mono font-bold text-xs"
                  />
                </td>
                <td className="py-1.5 px-3 text-right">
                  <input
                    type="number"
                    value={s.default_admission_fee}
                    onChange={(e) => handleChange(s.class_name, 'default_admission_fee', Number(e.target.value))}
                    className="w-20 border border-slate-300 rounded-md px-2 py-1 text-right font-mono font-bold text-xs"
                  />
                </td>
                <td className="py-1.5 px-3 text-center">
                  <button
                    onClick={() => handleSave(s.class_name)}
                    disabled={savingClass === s.class_name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition"
                  >
                    <Save size={12} />
                    <span>{savingClass === s.class_name ? '...' : lang === 'hi' ? 'सेव' : 'Save'}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

