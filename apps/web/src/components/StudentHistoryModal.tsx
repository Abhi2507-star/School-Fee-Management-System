import React, { useState, useEffect } from 'react';
import { Student, ReceiptData } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { formatDateIndian, FEE_HEADS_LIST, OLD_BALANCE_HEAD, getWhatsAppDueUrl, generateWhatsAppDueMessage } from '../utils/constants';
import { apiRequest } from '../services/api';
import { X, Calendar, User, Phone, MapPin, Receipt, Edit, Trash2, UserMinus, UserCheck, MessageSquare, ArrowUpRight } from 'lucide-react';

interface StudentHistoryModalProps {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
  onViewReceipt: (receiptNo: string) => void;
  onRefresh: () => void;
}

export const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({
  student: initialStudent,
  onClose,
  onEdit,
  onViewReceipt,
  onRefresh,
}) => {
  const { lang, t } = useLanguage();
  const [student, setStudent] = useState<Student>(initialStudent);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch fresh detailed data including full history and payments
  useEffect(() => {
    apiRequest<{ student: Student }>(`/students/${initialStudent.id}`)
      .then((res) => {
        if (res.student) setStudent(res.student);
      })
      .catch(() => {});
  }, [initialStudent.id]);

  const isActive = student.status === 'ACTIVE';
  const hasOldDue = (student.previous_class_due || 0) > 0;

  // Toggle Left / Active status
  const handleToggleStatus = async () => {
    const newStatus = isActive ? 'LEFT' : 'ACTIVE';
    const confirmMsg =
      newStatus === 'LEFT'
        ? lang === 'hi'
          ? `क्या आप ${student.student_name} का नाम "स्कूल छोड़ दिया (LEFT / TC)" में दर्ज करना चाहते हैं?\n(पुरानी फीस रसीदें और बकाया सुरक्षित रहेंगी)`
          : `Mark ${student.student_name} as LEFT / TC?\n(Past receipts and pending dues remain preserved)`
        : lang === 'hi'
        ? `क्या आप ${student.student_name} को पुनः पढ़ रहे बच्चों (ACTIVE) में शामिल करना चाहते हैं?`
        : `Re-activate ${student.student_name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiRequest<{ student: Student }>(
        newStatus === 'LEFT' ? `/students/${student.id}/mark-left` : `/students/${student.id}/mark-active`,
        { method: 'POST' }
      );
      if (res.student) setStudent(res.student);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Error updating status');
    }
  };

  // WhatsApp due url
  const waUrl = React.useMemo(() => {
    if (!student.mobile) return '';
    const msg = generateWhatsAppDueMessage({
      studentName: student.student_name,
      fatherName: student.father_name,
      className: student.class_name,
      previousClassDue: student.previous_class_due || 0,
      currentClassDue: 0,
      unpaidMonthsText: 'बकाया शुल्क',
      totalDue: student.previous_class_due || 0,
    });
    return getWhatsAppDueUrl(student.mobile, msg);
  }, [student]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-black text-base text-amber-300">
              {student.roll_no}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">{student.student_name}</h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {isActive
                    ? lang === 'hi' ? 'पढ़ रहा है' : 'ACTIVE'
                    : lang === 'hi' ? 'स्कूल छोड़ दिया' : 'LEFT'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                {student.class_name} • {lang === 'hi' ? 'सत्र' : 'Session'}: {student.academic_year}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
          {/* Section 1: Student Details Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-500">{t('fatherName')}</span>
              <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">{student.father_name}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-500">{t('village')}</span>
              <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">{student.village}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-500">{t('mobile')}</span>
              <span className="font-bold font-mono text-slate-800 text-xs mt-0.5 block">
                {student.mobile || '—'}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-500">
                {lang === 'hi' ? 'दाखिला माह' : 'Joined Month'}
              </span>
              <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                {student.joined_month || 'APRIL'}
              </span>
            </div>
          </div>

          {/* Previous Class Due Alert Box */}
          {hasOldDue && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-black text-red-900">
                  {lang === 'hi' ? 'पिछली कक्षा का बकाया (Previous Class Due)' : 'Previous Class Due'}
                </span>
                <span className="text-lg font-black font-mono text-red-600 mt-0.5 block">
                  ₹{student.previous_class_due}
                </span>
              </div>
              {student.mobile && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
                >
                  <MessageSquare size={13} />
                  <span>{lang === 'hi' ? 'व्हाट्सएप भेजें' : 'WhatsApp Due'}</span>
                </a>
              )}
            </div>
          )}

          {/* Section 2: Multi-Year Academic History */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar size={14} className="text-blue-700" />
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                {lang === 'hi' ? 'कक्षा एवं सत्र इतिहास (Academic History)' : 'Multi-Year Academic History'}
              </h4>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                    <th className="py-1.5 px-2.5">{lang === 'hi' ? 'सत्र (Session)' : 'Session'}</th>
                    <th className="py-1.5 px-2.5">{lang === 'hi' ? 'कक्षा (Class)' : 'Class'}</th>
                    <th className="py-1.5 px-2.5 text-center">{lang === 'hi' ? 'क्रमांक' : 'Roll'}</th>
                    <th className="py-1.5 px-2.5 text-right">{lang === 'hi' ? 'बकाया स्थिति' : 'Due Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Current Active Session */}
                  <tr className="bg-blue-50/50">
                    <td className="py-1.5 px-2.5 font-bold text-blue-900 font-mono">
                      {student.academic_year} <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-sans">{lang === 'hi' ? 'वर्तमान' : 'Current'}</span>
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-800">{student.class_name}</td>
                    <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-700">{student.roll_no}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold">
                      {student.previous_class_due > 0 ? (
                        <span className="text-red-600">₹{student.previous_class_due}</span>
                      ) : (
                        <span className="text-emerald-700">₹0</span>
                      )}
                    </td>
                  </tr>

                  {/* Past Snapshots from StudentClassHistory */}
                  {(student.history || []).map((h) => (
                    <tr key={h.id} className="text-slate-600 hover:bg-slate-50">
                      <td className="py-1.5 px-2.5 font-mono">{h.academic_year}</td>
                      <td className="py-1.5 px-2.5">{h.class_name}</td>
                      <td className="py-1.5 px-2.5 text-center font-mono">{h.roll_no}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono">
                        {h.pending_due_amount > 0 ? `₹${h.pending_due_amount}` : '₹0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Fee Payment Receipts History */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Receipt size={14} className="text-emerald-700" />
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                {lang === 'hi' ? 'जारी की गई रसीदें (Payment Receipts)' : 'Payment History & Receipts'}
              </h4>
            </div>

            {(!student.payments || student.payments.length === 0) ? (
              <div className="p-4 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                {lang === 'hi' ? 'अभी तक कोई भुगतान नहीं हुआ है।' : 'No payment records yet.'}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                    <tr>
                      <th className="py-1.5 px-2.5">{lang === 'hi' ? 'रसीद संख्या' : 'Receipt No'}</th>
                      <th className="py-1.5 px-2.5">{lang === 'hi' ? 'मद / महीना' : 'Fee Head'}</th>
                      <th className="py-1.5 px-2.5 text-right">{lang === 'hi' ? 'राशि' : 'Amount'}</th>
                      <th className="py-1.5 px-2.5 text-center">{lang === 'hi' ? 'तारीख' : 'Date'}</th>
                      <th className="py-1.5 px-2.5 text-center">{lang === 'hi' ? 'प्रिंट' : 'Print'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {student.payments.map((p) => {
                      const headInfo =
                        p.fee_head === 'OLD_BALANCE'
                          ? OLD_BALANCE_HEAD
                          : FEE_HEADS_LIST.find((h) => h.id === p.fee_head);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="py-1.5 px-2.5 font-mono font-bold text-blue-900">{p.receipt_no}</td>
                          <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                            {lang === 'hi' ? headInfo?.labelHi || p.fee_head : headInfo?.labelEn || p.fee_head}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700">₹{p.amount_paid}</td>
                          <td className="py-1.5 px-2.5 text-center text-slate-600">{formatDateIndian(p.payment_date)}</td>
                          <td className="py-1.5 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => onViewReceipt(p.receipt_no)}
                              className="text-blue-700 hover:text-blue-800 font-bold hover:underline inline-flex items-center gap-0.5 text-[11px]"
                            >
                              <span>{lang === 'hi' ? 'रसीद' : 'View'}</span>
                              <ArrowUpRight size={11} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-2.5 px-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                isActive
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
              }`}
            >
              {isActive ? <UserMinus size={13} /> : <UserCheck size={13} />}
              <span>
                {isActive
                  ? lang === 'hi' ? 'स्कूल छोड़ दिया (TC)' : 'Mark Left'
                  : lang === 'hi' ? 'सक्रिय करें (Rejoin)' : 'Mark Active'}
              </span>
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
            >
              <Edit size={13} />
              <span>{lang === 'hi' ? 'एडिट करें' : 'Edit'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-lg shadow-xs transition"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

