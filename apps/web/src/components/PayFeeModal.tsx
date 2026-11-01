import React, { useState, useMemo } from 'react';
import { Student, FeeStructure, ReceiptData } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { FEE_HEADS_LIST, isHeadApplicableForJoinedMonth } from '../utils/constants';
import { apiRequest } from '../services/api';
import { X, Check, Calculator, AlertCircle, History } from 'lucide-react';

interface PayFeeModalProps {
  student: Student;
  feeStructure?: FeeStructure;
  role: string;
  onClose: () => void;
  onSuccess: (receipt: ReceiptData) => void;
}

export const PayFeeModal: React.FC<PayFeeModalProps> = ({
  student,
  feeStructure,
  role,
  onClose,
  onSuccess,
}) => {
  const { lang, t } = useLanguage();
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedHeads, setSelectedHeads] = useState<string[]>([]);

  // Previous Class Due (Old Balance)
  const hasPreviousDue = (student.previous_class_due || 0) > 0;
  const [payOldBalance, setPayOldBalance] = useState(false);
  const [oldBalanceAmount, setOldBalanceAmount] = useState<number>(student.previous_class_due || 0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const monthlyFee = feeStructure?.monthly_fee ?? 250;
  const examFee = feeStructure?.exam_fee ?? 250;
  const defaultAdmFee = feeStructure?.default_admission_fee ?? 500;

  const paidMap = useMemo(() => {
    const map = new Map<string, { amount: number; date: string }>();
    for (const p of student.payments || []) {
      map.set(p.fee_head, { amount: p.amount_paid, date: p.payment_date });
    }
    return map;
  }, [student.payments]);

  // Compute total amount based on regular selection + old balance
  const totalAmount = useMemo(() => {
    let sum = 0;
    for (const headId of selectedHeads) {
      if (headId === 'ADMISSION') {
        sum += student.admission_fee_amount > 0 ? student.admission_fee_amount : defaultAdmFee;
      } else if (headId === 'QUARTERLY_EXAM' || headId === 'HALF_YEARLY_EXAM' || headId === 'ANNUAL_EXAM') {
        sum += examFee;
      } else {
        sum += monthlyFee;
      }
    }
    if (payOldBalance) {
      sum += Math.max(0, Number(oldBalanceAmount) || 0);
    }
    return sum;
  }, [selectedHeads, payOldBalance, oldBalanceAmount, student, defaultAdmFee, examFee, monthlyFee]);

  const toggleHead = (headId: string) => {
    setSelectedHeads((prev) =>
      prev.includes(headId) ? prev.filter((h) => h !== headId) : [...prev, headId]
    );
    setError('');
  };

  const handleSelectAllUnpaid = () => {
    const unpaid: string[] = [];
    for (const h of FEE_HEADS_LIST) {
      if (!isHeadApplicableForJoinedMonth(h.id, student.joined_month)) continue;
      if (!paidMap.has(h.id)) {
        if (h.id === 'ADMISSION' && student.admission_fee_status === 'FREE') continue;
        unpaid.push(h.id);
      }
    }
    setSelectedHeads(unpaid);
    if (hasPreviousDue) {
      setPayOldBalance(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHeads.length === 0 && (!payOldBalance || Number(oldBalanceAmount) <= 0)) {
      setError(
        lang === 'hi'
          ? 'कृपया कम से कम एक माह या पिछला बकाया चुनें (Select at least one month or old balance).'
          : 'Please select at least one month or previous class due to pay.'
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiRequest<{ success: boolean; receipt: ReceiptData }>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          student_id: student.id,
          fee_heads: selectedHeads,
          pay_old_balance: payOldBalance,
          old_balance_amount: payOldBalance ? Number(oldBalanceAmount) || 0 : 0,
          payment_date: paymentDate,
          collected_by: role === 'ADMIN' ? 'प्रधानाचार्य / Admin' : 'फीस जमाकर्ता / Fee Collector',
        }),
      });

      if (res.success && res.receipt) {
        onSuccess(res.receipt);
      }
    } catch (err: any) {
      setError(err.message || 'Payment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-700 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-orange-200">
              {lang === 'hi' ? '3-क्लिक फीस भुगतान' : '3-Click Fee Submission'}
            </div>
            <h3 className="text-lg font-black tracking-tight mt-0.5">
              {t('payFee')} — {student.student_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Student Info Bar */}
        <div className="bg-orange-50/70 border-b border-orange-200 px-5 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-orange-950">
              क्रमांक: <span className="font-mono text-sm">{student.roll_no}</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-700">
              पिता: <strong>{student.father_name}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-700">गाँव: {student.village}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-orange-600 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[11px]">
              {student.class_name} ({student.academic_year})
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-bold text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Payment Date & Quick Select Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">
                {lang === 'hi' ? 'भुगतान तारीख:' : 'Payment Date:'}
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={handleSelectAllUnpaid}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
            >
              {lang === 'hi' ? '✓ सारा बकाया चुनें' : '✓ Select All Unpaid'}
            </button>
          </div>

          {/* FEATURE 4: Previous Class Due Checkbox (if previous_class_due > 0) */}
          {hasPreviousDue && (
            <div className="p-3.5 bg-red-50 rounded-xl border-2 border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-start sm:items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payOldBalance}
                  onChange={(e) => setPayOldBalance(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-0 mt-0.5 sm:mt-0"
                />
                <div>
                  <div className="text-xs font-black text-red-900 flex items-center gap-1.5">
                    <History size={14} className="text-red-600" />
                    <span>
                      {lang === 'hi'
                        ? 'पिछली कक्षा का बकाया जमा करें (Pay Old Class Due)'
                        : 'Pay Previous Class Due'}
                    </span>
                  </div>
                  <div className="text-[11px] text-red-700 font-semibold">
                    {lang === 'hi'
                      ? `कुल पिछला बकाया: ₹${student.previous_class_due}`
                      : `Total Old Due: ₹${student.previous_class_due}`}
                  </div>
                </div>
              </label>

              {payOldBalance && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <span className="text-xs font-bold text-red-900">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={student.previous_class_due}
                    value={oldBalanceAmount}
                    onChange={(e) => setOldBalanceAmount(Number(e.target.value))}
                    className="w-24 border border-red-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-red-900 bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Months & Exam Heads Grid */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">
              {lang === 'hi'
                ? `चालू कक्षा शुल्क (${student.class_name} - ${student.academic_year})`
                : `Current Class Fees (${student.class_name} - ${student.academic_year})`}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FEE_HEADS_LIST.map((head) => {
                const paid = paidMap.get(head.id);
                const isSelected = selectedHeads.includes(head.id);
                const isApplicable = isHeadApplicableForJoinedMonth(head.id, student.joined_month);

                let cost = monthlyFee;
                if (head.id === 'ADMISSION') {
                  cost = student.admission_fee_amount > 0 ? student.admission_fee_amount : defaultAdmFee;
                } else if (head.id === 'QUARTERLY_EXAM' || head.id === 'HALF_YEARLY_EXAM' || head.id === 'ANNUAL_EXAM') {
                  cost = examFee;
                }

                // If not applicable due to joining month (e.g. joined in July, so Apr-Jun not applicable)
                if (!isApplicable) {
                  return (
                    <div
                      key={head.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 flex flex-col justify-between select-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{lang === 'hi' ? head.shortHi : head.shortEn}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1 rounded">
                          {lang === 'hi' ? 'दाखिला पूर्व' : 'Before Adm'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">—</div>
                    </div>
                  );
                }

                // If already paid
                if (paid) {
                  return (
                    <div
                      key={head.id}
                      className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex flex-col justify-between select-none opacity-80"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{lang === 'hi' ? head.shortHi : head.shortEn}</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 font-extrabold px-1 rounded">✓ {t('paid')}</span>
                      </div>
                      <div className="text-[11px] font-mono text-emerald-700 mt-1 font-bold">₹{paid.amount}</div>
                    </div>
                  );
                }

                // If free admission
                if (head.id === 'ADMISSION' && student.admission_fee_status === 'FREE') {
                  return (
                    <div
                      key={head.id}
                      className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 flex flex-col justify-between select-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{lang === 'hi' ? head.shortHi : head.shortEn}</span>
                        <span className="text-[10px] bg-blue-200 text-blue-800 font-extrabold px-1 rounded">{t('free')}</span>
                      </div>
                      <div className="text-[11px] text-blue-700 mt-1 font-semibold">₹0 (निःशुल्क)</div>
                    </div>
                  );
                }

                return (
                  <button
                    key={head.id}
                    type="button"
                    onClick={() => toggleHead(head.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{lang === 'hi' ? head.shortHi : head.shortEn}</span>
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-600 mt-1">₹{cost}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Calculation Bar */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Calculator size={20} className="text-orange-200" />
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-orange-100">
                  {lang === 'hi' ? 'कुल देय राशि' : 'Total Amount to Pay'}
                </div>
                <div className="text-xs text-orange-100">
                  {selectedHeads.length} {lang === 'hi' ? 'मद चयनित' : 'items selected'}
                  {payOldBalance ? ` + पिछला बकाया` : ''}
                </div>
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight bg-white/20 px-4 py-1 rounded-lg">
              ₹{totalAmount}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
            >
              {t('close')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalAmount <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition transform active:scale-95"
            >
              {isSubmitting ? (lang === 'hi' ? 'सुरक्षित हो रहा है...' : 'Saving...') : t('saveAndPrint')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
