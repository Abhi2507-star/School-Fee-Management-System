import React from 'react';
import { ReceiptData } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { amountToIndianWords, formatDateIndian } from '../utils/constants';
import { Printer, MessageCircle, X } from 'lucide-react';

interface ReceiptModalProps {
  receipt: ReceiptData;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const { lang, t } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const mobileDigits = (receipt.mobile || '').replace(/\D/g, '');
    const phone = mobileDigits.length === 10 ? `91${mobileDigits}` : mobileDigits;

    const itemsSummary = receipt.items
      .map((item) => `• ${item.labelHi} (${item.labelEn}): ₹${item.amount_paid}`)
      .join('\n');

    const msg = `*स्वामी विवेकानन्द शिक्षण संस्थान (Swami Vivekanand Sikshan Sansthan)*
हरीपुर, करौंदी कलां, कादीपुर, सुल्तानपुर (उ.प्र.)
--------------------------------
*फीस रसीद / FEE RECEIPT*
*रसीद सं. (Receipt No):* ${receipt.receipt_no}
*तारीख (Date):* ${formatDateIndian(receipt.payment_date)}

*विद्यार्थी (Student):* ${receipt.student_name}
*पिता का नाम (Father):* ${receipt.father_name}
*कक्षा (Class):* ${receipt.class_name}
*गाँव (Village):* ${receipt.village}

*जमा मद विवरण (Items Paid):*
${itemsSummary}

*कुल जमा राशि (Total Paid): ₹${receipt.total_amount}*
(${amountToIndianWords(receipt.total_amount)})
--------------------------------
धन्यवाद! आपका दिन शुभ हो।`;

    const encoded = encodeURIComponent(msg);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Top Header - No print */}
        <div className="no-print bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
            <span className="font-extrabold text-sm tracking-wide">
              {lang === 'hi' ? 'फीस रसीद (Fee Receipt)' : 'Official Fee Receipt'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
            title={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="p-6 bg-white text-slate-800">
          <div className="border-2 border-emerald-800 p-5 rounded-xl bg-gradient-to-b from-emerald-50/20 to-white">
            {/* School Branding */}
            <div className="text-center border-b-2 border-emerald-700 pb-3 mb-4">
              <h2 className="text-lg font-black text-emerald-900 tracking-tight">
                स्वामी विवेकानन्द शिक्षण संस्थान
              </h2>
              <div className="text-xs font-bold text-slate-700 mt-0.5">
                SWAMI VIVEKANAND SIKSHAN SANSTHAN
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                हरीपुर, करौंदी कलां, कादीपुर, सुल्तानपुर (उ.प्र.) — 228161
              </p>
              <div className="inline-block mt-2 bg-emerald-800 text-white text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                {lang === 'hi' ? 'फीस जमा रसीद (FEE RECEIPT)' : 'OFFICIAL FEE RECEIPT'}
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">{t('receiptNo')}:</span>
                <span className="font-mono font-bold text-emerald-800 ml-1">
                  {receipt.receipt_no}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">{t('date')}:</span>
                <span className="font-semibold text-slate-800 ml-1">
                  {formatDateIndian(receipt.payment_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">{t('studentName')}:</span>
                <strong className="text-slate-900 ml-1">{receipt.student_name}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500">{t('fatherName')}:</span>
                <strong className="text-slate-900 ml-1">{receipt.father_name}</strong>
              </div>
              <div>
                <span className="text-slate-500">{lang === 'hi' ? 'कक्षा:' : 'Class:'}</span>
                <span className="font-bold text-slate-800 ml-1">{receipt.class_name}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">{t('village')}:</span>
                <span className="font-semibold text-slate-800 ml-1">{receipt.village}</span>
              </div>
              {receipt.mobile && (
                <div className="col-span-2 text-slate-600 text-[11px]">
                  <span>{t('mobile')}:</span> <strong>{receipt.mobile}</strong>
                </div>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full text-xs border-collapse mb-4">
              <thead>
                <tr className="bg-emerald-100 text-emerald-950 border-b border-emerald-300">
                  <th className="py-1.5 px-2 text-left w-10">#</th>
                  <th className="py-1.5 px-2 text-left">{lang === 'hi' ? 'मद / महीना' : 'Fee Head / Month'}</th>
                  <th className="py-1.5 px-2 text-right">{lang === 'hi' ? 'राशि (₹)' : 'Amount (₹)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receipt.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-semibold text-slate-800">
                      {lang === 'hi' ? item.labelHi : item.labelEn}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                      ₹{item.amount_paid}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="border-t-2 border-emerald-700 pt-2.5">
              <div className="flex justify-between items-center text-sm font-black text-emerald-900">
                <span>{lang === 'hi' ? 'कुल प्राप्त राशि (Total Paid):' : 'Total Amount Paid:'}</span>
                <span className="text-base font-mono bg-emerald-100 px-3 py-1 rounded-lg">
                  ₹{receipt.total_amount}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 italic">
                {amountToIndianWords(receipt.total_amount)}
              </div>
            </div>

            {/* Signature & Stamp */}
            <div className="mt-8 pt-4 border-t border-dashed border-slate-300 flex justify-between items-end text-[11px] text-slate-500">
              <div>
                <div>जमाकर्ता हस्ताक्षर</div>
                <div className="text-[9px] text-slate-400">Depositor Signature</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-700">{receipt.collected_by}</div>
                <div>हस्ताक्षर / मोहर (Authorized Sign & Stamp)</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Action Buttons - No print */}
        <div className="no-print bg-slate-100 px-5 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition transform active:scale-95"
            >
              <Printer size={16} />
              <span>{t('printReceipt')}</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition transform active:scale-95"
            >
              <MessageCircle size={16} />
              <span>{t('sendWhatsApp')}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold text-xs rounded-xl transition"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
