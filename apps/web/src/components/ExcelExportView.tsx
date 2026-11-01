import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { CLASSES_LIST, FEE_HEADS_LIST, formatDateIndian } from '../utils/constants';
import { apiRequest } from '../services/api';
import { Student, ReportSummary } from '../types';
import { FileSpreadsheet, Download, CheckCircle } from 'lucide-react';

export const ExcelExportView: React.FC = () => {
  const { lang, t } = useLanguage();
  const [downloadingClass, setDownloadingClass] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [msg, setMsg] = useState('');

  // 1. Export Class Register Grid as CSV
  const handleExportClassRegister = async (className: string) => {
    setDownloadingClass(className);
    setMsg('');

    try {
      const res = await apiRequest<{ students: Student[] }>(
        `/students?class_name=${encodeURIComponent(className)}&status=ALL`
      );
      const students = res.students || [];

      // Build CSV Headers matching the physical register
      const headers = [
        'Roll No (क्रमांक)',
        'Status (स्थिति)',
        'Student Name (नाम)',
        "Father's Name (पिता का नाम)",
        'Village (पता-गाँव)',
        'Mobile (मोबाइल)',
        'Admission Fee (प्रवेश शुल्क)',
        'Previous Due (पिछला बकाया)',
        ...FEE_HEADS_LIST.filter((h) => h.id !== 'ADMISSION').map((h) => `${h.labelEn} (${h.labelHi})`),
      ];

      const rows: string[][] = [];

      for (const st of students) {
        const paymentMap = new Map(st.payments.map((p) => [p.fee_head, p]));
        const admPaid = paymentMap.get('ADMISSION');

        let admCol = '';
        if (st.admission_fee_status === 'FREE') admCol = 'FREE (निःशुल्क)';
        else if (admPaid) admCol = `PAID ₹${admPaid.amount_paid} on ${admPaid.payment_date}`;
        else admCol = `DUE ₹${st.admission_fee_amount || 500}`;

        const monthCols = FEE_HEADS_LIST.filter((h) => h.id !== 'ADMISSION').map((h) => {
          const p = paymentMap.get(h.id);
          return p ? `PAID ₹${p.amount_paid} (${p.payment_date})` : '—';
        });

        rows.push([
          String(st.roll_no),
          st.status === 'LEFT' ? 'LEFT (स्कूल छोड़ दिया / TC)' : 'ACTIVE (पढ़ रहा है)',
          `"${st.student_name}"`,
          `"${st.father_name}"`,
          `"${st.village}"`,
          `"${st.mobile}"`,
          `"${admCol}"`,
          String(st.previous_class_due || 0),
          ...monthCols.map((c) => `"${c}"`),
        ]);
      }

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SVSS_${className.replace(/\s+/g, '_')}_Register_2026-27.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMsg(
        lang === 'hi'
          ? `${className} का रजिस्टर एक्सेल (.csv) में डाउनलोड हो गया है।`
          : `${className} register downloaded successfully.`
      );
    } catch (e: any) {
      alert(e.message || 'Error exporting class register');
    } finally {
      setDownloadingClass(null);
    }
  };

  // 2. Export All Payments Collection Report
  const handleExportPaymentsReport = async () => {
    setDownloadingReport(true);
    setMsg('');

    try {
      const res = await apiRequest<ReportSummary>('/reports/summary');
      const payments = res.recent_payments || [];

      const headers = [
        'Receipt No (रसीद सं.)',
        'Date (तारीख)',
        'Student Name (विद्यार्थी)',
        'Class (कक्षा)',
        "Father's Name (पिता का नाम)",
        'Village (गाँव)',
        'Fee Head (मद/महीना)',
        'Amount Paid (जमा राशि ₹)',
        'Collected By (जमाकर्ता)',
      ];

      const rows = payments.map((p) => [
        `"${p.receipt_no}"`,
        `"${formatDateIndian(p.payment_date)}"`,
        `"${p.student?.student_name || ''}"`,
        `"${p.student?.class_name || ''}"`,
        `"${p.student?.father_name || ''}"`,
        `"${p.student?.village || ''}"`,
        `"${p.fee_head}"`,
        String(p.amount_paid),
        `"${p.collected_by || ''}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SVSS_Fee_Collection_Report_2026-27.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMsg(
        lang === 'hi'
          ? 'फीस कलेक्शन रिपोर्ट एक्सेल (.csv) में डाउनलोड हो गई है।'
          : 'Fee collection report downloaded successfully.'
      );
    } catch (e: any) {
      alert(e.message || 'Error exporting payments report');
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-emerald-700" />
          <span>{t('exportExcel')}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {lang === 'hi'
            ? 'विद्यालय के रजिस्टर व सभी जमा रिपोर्ट 1-क्लिक में एक्सेल (.csv) फाइल के रूप में डाउनलोड करें।'
            : 'Download exact class register grids and payment reports in Excel (.csv) format.'}
        </p>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* Class Registers Download Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {lang === 'hi' ? '1. कक्षा-वार उपस्थिति व फीस रजिस्टर डाउनलोड करें' : '1. Download Class-wise Registers'}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CLASSES_LIST.map((cls) => (
            <button
              key={cls}
              onClick={() => handleExportClassRegister(cls)}
              disabled={downloadingClass === cls}
              className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-950 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <FileSpreadsheet size={22} className="text-emerald-700" />
              <span className="font-extrabold text-sm">{cls}</span>
              <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-bold">
                <Download size={11} />
                <span>{downloadingClass === cls ? '...' : lang === 'hi' ? 'डाउनलोड करें' : 'Download'}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Collection Report Download */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {lang === 'hi' ? '2. संपूर्ण फीस संग्रह रिपोर्ट डाउनलोड करें' : '2. Download Total Fee Collection Report'}
        </h4>
        <div>
          <button
            onClick={handleExportPaymentsReport}
            disabled={downloadingReport}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <Download size={16} />
            <span>
              {downloadingReport
                ? lang === 'hi'
                  ? 'डाउनलोड हो रहा है...'
                  : 'Downloading...'
                : lang === 'hi'
                ? 'संपूर्ण कलेक्शन रिपोर्ट डाउनलोड करें (All Collections CSV)'
                : 'Download Full Collection Report (CSV)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
