import React from 'react';
import { Student, ReceiptData } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { FEE_HEADS_LIST, formatDateIndian, isHeadApplicableForJoinedMonth, generateWhatsAppDueMessage, getWhatsAppDueUrl } from '../utils/constants';
import { CreditCard, Edit3, MessageSquare, History, User } from 'lucide-react';

interface RegisterGridProps {
  students: Student[];
  onPayFee: (student: Student) => void;
  onViewReceipt: (receipt: ReceiptData) => void;
  onEditStudent?: (student: Student) => void;
  onSelectStudentHistory?: (student: Student) => void;
  isAdmin?: boolean;
}

export const RegisterGrid: React.FC<RegisterGridProps> = ({
  students,
  onPayFee,
  onViewReceipt,
  onEditStudent,
  onSelectStudentHistory,
  isAdmin = false,
}) => {
  const { lang, t } = useLanguage();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white border-b border-slate-900 sticky top-0 z-30 text-[11px] font-bold uppercase tracking-wide">
              <th className="py-2 px-2.5 text-center border-r border-slate-700/80 w-11 sticky left-0 bg-slate-800 z-20">
                {t('rollNo')}
              </th>
              <th className="py-2 px-2.5 text-left border-r border-slate-700/80 min-w-[130px] sticky left-11 bg-slate-800 z-20">
                {t('studentName')}
              </th>
              <th className="py-2 px-2.5 text-left border-r border-slate-700/80 min-w-[110px]">
                {t('fatherName')}
              </th>
              <th className="py-2 px-2 text-left border-r border-slate-700/80 min-w-[90px]">
                {t('village')}
              </th>
              <th className="py-2 px-2 text-left border-r border-slate-700/80 min-w-[85px]">
                {t('mobile')}
              </th>
              <th className="py-2 px-2 text-center border-r border-slate-700/80 min-w-[80px]">
                {t('admissionFee')}
              </th>

              {/* Red Old Due (पिछला बकाया) Column */}
              <th className="py-2 px-2 text-center border-r border-red-900 min-w-[90px] bg-red-950/90 text-red-200">
                {t('oldBalance')}
              </th>

              {/* 15 Academic Month & Exam Columns */}
              {FEE_HEADS_LIST.filter((h) => h.id !== 'ADMISSION').map((h) => (
                <th
                  key={h.id}
                  className={`py-2 px-1.5 text-center border-r border-slate-700/80 min-w-[62px] ${
                    h.isExam ? 'bg-amber-800 text-amber-100 font-extrabold' : ''
                  }`}
                  title={lang === 'hi' ? h.labelHi : h.labelEn}
                >
                  <div>{lang === 'hi' ? h.shortHi : h.shortEn}</div>
                </th>
              ))}

              <th className="py-2 px-2.5 text-center min-w-[125px] sticky right-0 bg-slate-800 z-20">
                {t('actions')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {students.map((st) => {
              const paymentMap = new Map(st.payments.map((p) => [p.fee_head, p]));
              const admPaid = paymentMap.get('ADMISSION');
              const hasOldDue = (st.previous_class_due || 0) > 0;
              const isLeft = st.status === 'LEFT';

              // Unpaid months text for WhatsApp
              const unpaidMonths = FEE_HEADS_LIST.filter(
                (h) =>
                  h.id !== 'ADMISSION' &&
                  isHeadApplicableForJoinedMonth(h.id, st.joined_month) &&
                  !paymentMap.has(h.id)
              );

              const waMsg = generateWhatsAppDueMessage({
                studentName: st.student_name,
                fatherName: st.father_name,
                className: st.class_name,
                previousClassDue: st.previous_class_due || 0,
                currentClassDue: unpaidMonths.length * 250,
                unpaidMonthsText: unpaidMonths.map((m) => m.shortHi).join(', '),
                totalDue: (st.previous_class_due || 0) + unpaidMonths.length * 250,
              });
              const waUrl = getWhatsAppDueUrl(st.mobile, waMsg);

              return (
                <tr
                  key={st.id}
                  className={`transition-colors group ${
                    isLeft ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'hover:bg-amber-50/40'
                  }`}
                >
                  {/* Roll No */}
                  <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-amber-50/40 z-10">
                    #{st.roll_no}
                  </td>

                  {/* Student Name (Clickable to open Student Complete History Modal) */}
                  <td className="py-2.5 px-3 border-r border-slate-200 sticky left-12 bg-white group-hover:bg-amber-50/40 z-10">
                    <button
                      type="button"
                      onClick={() => onSelectStudentHistory && onSelectStudentHistory(st)}
                      className="text-left group/btn"
                      title={lang === 'hi' ? 'बच्चे का पूरा रिकॉर्ड देखें' : 'View Complete History'}
                    >
                      <div className="font-extrabold text-blue-900 group-hover/btn:text-blue-700 group-hover/btn:underline text-sm flex items-center gap-1.5">
                        <span>{st.student_name}</span>
                        {isLeft && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.2 rounded">
                            {lang === 'hi' ? 'TC' : 'LEFT'}
                          </span>
                        )}
                      </div>
                      {st.joined_month && st.joined_month !== 'APRIL' && (
                        <div className="text-[10px] text-slate-500 font-semibold">
                          दाखिला: {st.joined_month}
                        </div>
                      )}
                    </button>
                  </td>

                  {/* Father's Name */}
                  <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700 font-medium">
                    {st.father_name}
                  </td>

                  {/* Village */}
                  <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-800">
                    {st.village}
                  </td>

                  {/* Mobile */}
                  <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                    {st.mobile || '—'}
                  </td>

                  {/* Admission Fee Column */}
                  <td className="py-2 px-2 text-center border-r border-slate-200">
                    {st.admission_fee_status === 'FREE' ? (
                      <span className="inline-block px-2 py-1 rounded-md bg-blue-100 text-blue-900 font-extrabold text-[10px] uppercase tracking-wider">
                        {t('free')}
                      </span>
                    ) : admPaid ? (
                      <button
                        onClick={() =>
                          onViewReceipt({
                            receipt_no: admPaid.receipt_no,
                            payment_date: admPaid.payment_date,
                            student_id: st.id,
                            student_name: st.student_name,
                            father_name: st.father_name,
                            village: st.village,
                            mobile: st.mobile,
                            class_name: st.class_name,
                            academic_year: st.academic_year,
                            collected_by: admPaid.collected_by,
                            items: [
                              {
                                fee_head: 'ADMISSION',
                                labelEn: 'Admission Fee',
                                labelHi: 'प्रवेश शुल्क',
                                amount_paid: admPaid.amount_paid,
                              },
                            ],
                            total_amount: admPaid.amount_paid,
                          })
                        }
                        className="w-full bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-400 text-emerald-950 rounded p-1 transition cursor-pointer text-center block shadow-2xs"
                        title={lang === 'hi' ? 'रसीद देखें' : 'View receipt'}
                      >
                        <div className="font-mono font-black text-xs leading-none">₹{admPaid.amount_paid}</div>
                        <div className="text-[9px] text-emerald-800 font-semibold mt-0.5 leading-none">
                          {formatDateIndian(admPaid.payment_date)}
                        </div>
                      </button>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded-md bg-red-100 text-red-800 font-bold text-[10px]">
                        {st.admission_fee_amount > 0 ? `₹${st.admission_fee_amount}` : t('pending')}
                      </span>
                    )}
                  </td>

                  {/* CRITICAL FEATURE 5: Red Old Due (पिछला बकाया) Cell */}
                  <td className="py-2 px-2 text-center border-r border-slate-200">
                    {hasOldDue ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-red-100 border border-red-300 text-red-900 font-mono font-black text-xs">
                        ₹{st.previous_class_due} {lang === 'hi' ? 'बाकी' : 'Due'}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-mono text-xs select-none">—</span>
                    )}
                  </td>

                  {/* 15 Months & Exam Columns */}
                  {FEE_HEADS_LIST.filter((h) => h.id !== 'ADMISSION').map((h) => {
                    const payment = paymentMap.get(h.id);
                    const isApplicable = isHeadApplicableForJoinedMonth(h.id, st.joined_month);

                    if (!isApplicable) {
                      return (
                        <td key={h.id} className="py-2 px-1 text-center border-r border-slate-200 bg-slate-50/60">
                          <span className="text-slate-300 font-mono text-xs" title="Joined after this month">—</span>
                        </td>
                      );
                    }

                    if (payment) {
                      return (
                        <td key={h.id} className="py-1 px-1 text-center border-r border-slate-200">
                          <button
                            onClick={() =>
                              onViewReceipt({
                                receipt_no: payment.receipt_no,
                                payment_date: payment.payment_date,
                                student_id: st.id,
                                student_name: st.student_name,
                                father_name: st.father_name,
                                village: st.village,
                                mobile: st.mobile,
                                class_name: st.class_name,
                                academic_year: st.academic_year,
                                collected_by: payment.collected_by,
                                items: [
                                  {
                                    fee_head: payment.fee_head,
                                    labelEn: h.labelEn,
                                    labelHi: h.labelHi,
                                    amount_paid: payment.amount_paid,
                                  },
                                ],
                                total_amount: payment.amount_paid,
                              })
                            }
                            className="w-full bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-400 text-emerald-950 rounded p-1 transition cursor-pointer text-center block shadow-2xs"
                            title={lang === 'hi' ? 'रसीद देखें' : 'Click to view receipt'}
                          >
                            <div className="font-mono font-black text-xs leading-none">₹{payment.amount_paid}</div>
                            <div className="text-[9px] text-emerald-800 font-semibold mt-0.5 leading-none">
                              {formatDateIndian(payment.payment_date)}
                            </div>
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td key={h.id} className="py-2 px-1 text-center border-r border-slate-200">
                        <span className="text-slate-300 font-mono text-xs select-none">—</span>
                      </td>
                    );
                  })}

                  {/* Actions Column */}
                  <td className="py-1.5 px-2 text-center sticky right-0 bg-white group-hover:bg-amber-50/40 z-10 border-l border-slate-200">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onPayFee(st)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] rounded-md shadow-2xs transition active:scale-95"
                      >
                        <CreditCard size={12} />
                        <span>{t('payFee')}</span>
                      </button>

                      {/* 1-Click WhatsApp Due Reminder */}
                      {st.mobile && (hasOldDue || unpaidMonths.length > 0) && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 transition"
                          title={lang === 'hi' ? 'व्हाट्सएप पर बकाया भेजें' : 'Send Due on WhatsApp'}
                        >
                          <MessageSquare size={13} />
                        </a>
                      )}

                      {isAdmin && onEditStudent && (
                        <button
                          onClick={() => onEditStudent(st)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition"
                          title={lang === 'hi' ? 'एडिट करें' : 'Edit Student'}
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {students.length === 0 && (
              <tr>
                <td colSpan={24} className="py-12 text-center text-slate-500 text-sm">
                  {lang === 'hi'
                    ? 'इस कक्षा में कोई विद्यार्थी नहीं मिला।'
                    : 'No students found in this class.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
