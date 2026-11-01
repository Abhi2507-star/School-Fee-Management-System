import React, { useState, useEffect, useMemo } from 'react';
import { Student, FeeStructure } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { CLASSES_LIST, SESSIONS_LIST, FEE_HEADS_LIST, isHeadApplicableForJoinedMonth, getNextClass, getClassLabel } from '../utils/constants';
import { apiRequest } from '../services/api';
import { ArrowRight, CheckCircle2, AlertCircle, Sparkles, UserMinus, UserCheck, ShieldCheck } from 'lucide-react';

interface PromotionItemState {
  student: Student;
  action: 'PROMOTE' | 'LEFT';
  calculatedDue: number;
  carryDue: number; // Editable by Admin
}

export const ClassPromotionTab: React.FC = () => {
  const { lang, t } = useLanguage();

  const [sourceClass, setSourceClass] = useState('Class 6');
  const [sourceSession, setSourceSession] = useState('2026-27');
  const [targetClass, setTargetClass] = useState('Class 7');
  const [targetSession, setTargetSession] = useState('2027-28');
  const [isGraduating, setIsGraduating] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [promotionList, setPromotionList] = useState<PromotionItemState[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-suggest next class when sourceClass changes
  const handleSourceClassChange = (newSource: string) => {
    setSourceClass(newSource);
    const next = getNextClass(newSource);
    if (next) {
      setTargetClass(next);
      setIsGraduating(false);
    } else {
      // Class 12 → Graduated / Passed Out
      setTargetClass('');
      setIsGraduating(true);
    }
  };

  // Fetch Fee Structures
  useEffect(() => {
    apiRequest<{ fee_structures: FeeStructure[] }>('/fee-structures')
      .then((res) => setFeeStructures(res.fee_structures || []))
      .catch(() => {});
  }, []);

  // Fetch Students for selected source class & session
  const fetchStudents = async () => {
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await apiRequest<{ students: Student[] }>(
        `/students?class_name=${encodeURIComponent(sourceClass)}&academic_year=${encodeURIComponent(
          sourceSession
        )}&status=ACTIVE`
      );
      const studentData = res.students || [];
      setStudents(studentData);

      // Find structure for current class
      const fs = feeStructures.find((f) => f.class_name === sourceClass);
      const monthlyFee = fs?.monthly_fee || 250;
      const examFee = fs?.exam_fee || 250;
      const defaultAdmFee = fs?.default_admission_fee || 500;

      const items: PromotionItemState[] = studentData.map((st) => {
        const paidSet = new Set((st.payments || []).map((p) => p.fee_head));
        let due = 0;

        // Check admission
        if (st.admission_fee_status === 'PENDING' && !paidSet.has('ADMISSION')) {
          due += st.admission_fee_amount > 0 ? st.admission_fee_amount : defaultAdmFee;
        }

        // Check months & exams respecting joined_month
        for (const h of FEE_HEADS_LIST) {
          if (h.id === 'ADMISSION') continue;
          if (!isHeadApplicableForJoinedMonth(h.id, st.joined_month)) continue;
          if (!paidSet.has(h.id)) {
            due += h.isExam ? examFee : monthlyFee;
          }
        }

        const totalUnpaid = due + (st.previous_class_due || 0);

        return {
          student: st,
          action: 'PROMOTE',
          calculatedDue: totalUnpaid,
          carryDue: totalUnpaid,
        };
      });

      setPromotionList(items);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error loading class students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [sourceClass, sourceSession, feeStructures]);

  // Toggle single student promotion
  const toggleStudentAction = (studentId: number) => {
    setPromotionList((prev) =>
      prev.map((item) =>
        item.student.id === studentId
          ? { ...item, action: item.action === 'PROMOTE' ? 'LEFT' : 'PROMOTE' }
          : item
      )
    );
  };

  // Change carry due amount
  const handleCarryDueChange = (studentId: number, val: number) => {
    setPromotionList((prev) =>
      prev.map((item) =>
        item.student.id === studentId ? { ...item, carryDue: Math.max(0, val) } : item
      )
    );
  };

  // Promote all or unselect all
  const setAllActions = (act: 'PROMOTE' | 'LEFT') => {
    setPromotionList((prev) => prev.map((item) => ({ ...item, action: act })));
  };

  const promotedCount = useMemo(
    () => promotionList.filter((i) => i.action === 'PROMOTE').length,
    [promotionList]
  );
  const leftCount = useMemo(
    () => promotionList.filter((i) => i.action === 'LEFT').length,
    [promotionList]
  );

  const handleExecutePromotion = async () => {
    if (promotionList.length === 0) return;

    const confirmMsg =
      lang === 'hi'
        ? `क्या आप सच में ${promotedCount} बच्चों को ${targetClass} (${targetSession}) में प्रमोट करना चाहते हैं?\n(तथा ${leftCount} बच्चे "स्कूल छोड़ दिया" में दर्ज होंगे)`
        : `Confirm promotion of ${promotedCount} students to ${targetClass} (${targetSession}) and marking ${leftCount} students as Left School?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        source_class: sourceClass,
        source_year: sourceSession,
        target_class: targetClass,
        target_year: targetSession,
        students: promotionList.map((i) => ({
          student_id: i.student.id,
          action: i.action,
          carry_due: Number(i.carryDue) || 0,
        })),
      };

      const res = await apiRequest<{ success: boolean; message: string }>('/students/promote', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessMessage(res.message);
        // Refresh list
        fetchStudents();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Promotion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Title Card */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-900 text-white p-5 rounded-2xl shadow-lg border border-indigo-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-300" />
              <h2 className="text-xl font-black tracking-tight">
                {lang === 'hi'
                  ? 'अगली कक्षा में प्रमोट करें (Class Promotion)'
                  : '1-Click Class Promotion & Transition'}
              </h2>
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              {lang === 'hi'
                ? 'सत्र समाप्त होने पर बच्चों को अगली कक्षा में भेजें। बकाया फीस स्वतः नए सत्र में "पिछला बकाया" बनकर जुड़ जाएगी।'
                : 'Promote active students to next class while carrying forward unpaid dues automatically.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
              {students.length} {lang === 'hi' ? 'बच्चे उपस्थित' : 'Students Found'}
            </span>
          </div>
        </div>
      </div>

      {/* Class & Session Transition Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4">
          {/* Source Class & Session */}
          <div className="md:col-span-2 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">
              {lang === 'hi' ? 'वर्तमान कक्षा एवं सत्र (Current)' : 'From Class & Session'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={sourceClass}
                onChange={(e) => handleSourceClassChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white text-xs"
              >
                {CLASSES_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={sourceSession}
                onChange={(e) => setSourceSession(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white text-xs"
              >
                {SESSIONS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-sm">
              <ArrowRight size={20} />
            </div>
          </div>

          {/* Target Class & Session */}
          <div className="md:col-span-2 space-y-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
            <span className="block text-[11px] font-bold text-blue-900 uppercase">
              {lang === 'hi' ? 'प्रमोट होने वाली कक्षा एवं सत्र (Target)' : 'To Target Class & New Session'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full border border-blue-300 rounded-lg px-2.5 py-1.5 font-bold text-blue-950 bg-white text-xs"
              >
                {CLASSES_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={targetSession}
                onChange={(e) => setTargetSession(e.target.value)}
                className="w-full border border-blue-300 rounded-lg px-2.5 py-1.5 font-bold text-blue-950 bg-white text-xs"
              >
                {SESSIONS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 font-bold text-xs shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 font-bold text-xs shadow-sm">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Students Checklist Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            <span className="font-extrabold text-sm text-slate-800">
              {lang === 'hi'
                ? `${sourceClass} के विद्यार्थियों की सूची`
                : `Student List for ${sourceClass}`}
            </span>
            <span className="text-xs bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full">
              {promotionList.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAllActions('PROMOTE')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
            >
              <UserCheck size={14} />
              <span>{lang === 'hi' ? 'सभी को प्रमोट करें' : 'Promote All'}</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setAllActions('LEFT')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
            >
              <UserMinus size={14} />
              <span>{lang === 'hi' ? 'सभी को स्कूल छोड़ दिया करें' : 'Mark All Left'}</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-bold">
            {lang === 'hi' ? 'लोड हो रहा है...' : 'Loading students...'}
          </div>
        ) : promotionList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-semibold text-sm">
            {lang === 'hi'
              ? `${sourceClass} (${sourceSession}) में कोई सक्रिय विद्यार्थी नहीं मिला।`
              : `No active students found in ${sourceClass} (${sourceSession}).`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold">
                  <th className="p-3 text-center w-16">
                    {lang === 'hi' ? 'निर्णय' : 'Action'}
                  </th>
                  <th className="p-3 text-center w-16">{t('rollNo')}</th>
                  <th className="p-3">{t('studentName')}</th>
                  <th className="p-3">{t('fatherName')}</th>
                  <th className="p-3">{t('village')}</th>
                  <th className="p-3 text-right">
                    {lang === 'hi' ? 'इस कक्षा का बकाया' : 'Current Dues'}
                  </th>
                  <th className="p-3 text-right w-44">
                    {lang === 'hi' ? 'पिछला बकाया आगे जोड़ें (₹)' : 'Carry Forward Due (₹)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotionList.map((item) => {
                  const isPromote = item.action === 'PROMOTE';
                  return (
                    <tr
                      key={item.student.id}
                      className={`hover:bg-slate-50/80 transition ${
                        !isPromote ? 'bg-amber-50/40 text-slate-500' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPromote}
                            onChange={() => toggleStudentAction(item.student.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                          />
                        </label>
                      </td>

                      {/* Roll No */}
                      <td className="p-3 text-center font-mono font-bold text-slate-600">
                        {item.student.roll_no}
                      </td>

                      {/* Name with Badge */}
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.student.student_name}</span>
                          {!isPromote ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                              {lang === 'hi' ? 'स्कूल छोड़ दिया' : 'Left School'}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                              {targetClass}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Father */}
                      <td className="p-3 text-slate-700 font-medium">
                        {item.student.father_name}
                      </td>

                      {/* Village */}
                      <td className="p-3 text-slate-600">{item.student.village}</td>

                      {/* Calculated Current Due */}
                      <td className="p-3 text-right font-mono font-bold text-slate-700">
                        {item.calculatedDue > 0 ? (
                          <span className="text-red-600">₹{item.calculatedDue}</span>
                        ) : (
                          <span className="text-emerald-700">₹0</span>
                        )}
                      </td>

                      {/* Editable Carry Due */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={item.carryDue}
                            onChange={(e) =>
                              handleCarryDueChange(item.student.id, Number(e.target.value))
                            }
                            className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-slate-800 bg-white"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Big Promote Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-700">
            {lang === 'hi' ? (
              <span>
                • <strong className="text-blue-900">{promotedCount}</strong> बच्चे {targetClass} में जाएंगे,{' '}
                <strong className="text-amber-800">{leftCount}</strong> बच्चे स्कूल छोड़ने के रूप में दर्ज होंगे।
              </span>
            ) : (
              <span>
                • <strong className="text-blue-900">{promotedCount}</strong> students promoting to {targetClass},{' '}
                <strong className="text-amber-800">{leftCount}</strong> students marking as Left.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecutePromotion}
            disabled={isSubmitting || promotionList.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>
              {isSubmitting
                ? lang === 'hi'
                  ? 'प्रमोट किया जा रहा है...'
                  : 'Promoting Students...'
                : lang === 'hi'
                ? `चुने हुए बच्चों को ${targetClass} में प्रमोट करें`
                : `Promote Selected Students to ${targetClass}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

