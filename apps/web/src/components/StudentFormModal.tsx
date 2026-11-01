import React, { useState } from 'react';
import { Student } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { CLASSES_LIST, COMMON_VILLAGES, ACADEMIC_MONTHS, SESSIONS_LIST, getClassLabel } from '../utils/constants';
import { apiRequest } from '../services/api';
import { X, UserPlus, AlertCircle, Trash2, UserMinus, UserCheck } from 'lucide-react';

interface StudentFormModalProps {
  initialData?: Student | null;
  defaultClass?: string;
  defaultSession?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  initialData,
  defaultClass = 'Class 6',
  defaultSession = '2026-27',
  onClose,
  onSuccess,
}) => {
  const { lang, t } = useLanguage();
  const isEditing = Boolean(initialData);

  const [className, setClassName] = useState(initialData?.class_name || defaultClass);
  const [academicYear, setAcademicYear] = useState(initialData?.academic_year || defaultSession);
  const [rollNo, setRollNo] = useState(initialData?.roll_no?.toString() || '');
  const [studentName, setStudentName] = useState(initialData?.student_name || '');
  const [fatherName, setFatherName] = useState(initialData?.father_name || '');
  const [village, setVillage] = useState(initialData?.village || COMMON_VILLAGES[0]);
  const [customVillage, setCustomVillage] = useState('');
  const [isCustomVillage, setIsCustomVillage] = useState(
    initialData ? !COMMON_VILLAGES.includes(initialData.village) : false
  );
  const [mobile, setMobile] = useState(initialData?.mobile || '');
  const [status, setStatus] = useState<'ACTIVE' | 'LEFT'>(initialData?.status || 'ACTIVE');
  const [joinedMonth, setJoinedMonth] = useState(initialData?.joined_month || 'APRIL');
  const [previousClassDue, setPreviousClassDue] = useState(
    initialData?.previous_class_due?.toString() || '0'
  );

  // Admission Fee
  const [isFreeAdmission, setIsFreeAdmission] = useState(
    initialData?.admission_fee_status === 'FREE'
  );
  const [admissionAmount, setAdmissionAmount] = useState(
    initialData?.admission_fee_amount?.toString() || '500'
  );
  const [admissionStatus, setAdmissionStatus] = useState(
    initialData?.admission_fee_status || 'PAID'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !fatherName.trim()) {
      setError(lang === 'hi' ? 'कृपया विद्यार्थी एवं पिता का नाम भरें' : 'Please enter Student & Father name');
      return;
    }

    const finalVillage = isCustomVillage ? customVillage.trim() : village.trim();
    if (!finalVillage) {
      setError(lang === 'hi' ? 'कृपया गाँव का नाम भरें' : 'Please enter village name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const finalStatus = isFreeAdmission ? 'FREE' : admissionStatus;
    const finalAmount = isFreeAdmission ? 0 : Number(admissionAmount) || 0;

    try {
      if (isEditing && initialData) {
        await apiRequest(`/students/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            roll_no: Number(rollNo) || undefined,
            student_name: studentName.trim(),
            father_name: fatherName.trim(),
            village: finalVillage,
            mobile: mobile.trim(),
            class_name: className,
            academic_year: academicYear,
            status,
            joined_month: joinedMonth,
            previous_class_due: Number(previousClassDue) || 0,
            admission_fee_status: finalStatus,
            admission_fee_amount: finalAmount,
          }),
        });
      } else {
        await apiRequest('/students', {
          method: 'POST',
          body: JSON.stringify({
            roll_no: Number(rollNo) || undefined,
            student_name: studentName.trim(),
            father_name: fatherName.trim(),
            village: finalVillage,
            mobile: mobile.trim(),
            class_name: className,
            academic_year: academicYear,
            status,
            joined_month: joinedMonth,
            previous_class_due: Number(previousClassDue) || 0,
            admission_fee_status: finalStatus,
            admission_fee_amount: finalAmount,
            admission_fee_date: new Date().toISOString().slice(0, 10),
          }),
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error saving student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!initialData) return;
    const newStatus = status === 'ACTIVE' ? 'LEFT' : 'ACTIVE';
    const confirmMsg =
      newStatus === 'LEFT'
        ? lang === 'hi'
          ? `क्या आप ${initialData.student_name} का नाम "स्कूल छोड़ दिया (LEFT / TC)" में दर्ज करना चाहते हैं?\n(पुरानी फीस रसीदें और बकाया सुरक्षित रहेंगी)`
          : `Mark ${initialData.student_name} as LEFT / TC?\n(Past receipts and pending dues remain preserved)`
        : lang === 'hi'
        ? `क्या आप ${initialData.student_name} को पुनः पढ़ रहे बच्चों (ACTIVE) में शामिल करना चाहते हैं?`
        : `Re-activate ${initialData.student_name}?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      await apiRequest(
        newStatus === 'LEFT'
          ? `/students/${initialData.id}/mark-left`
          : `/students/${initialData.id}/mark-active`,
        { method: 'POST' }
      );
      setStatus(newStatus);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error updating status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePermanently = async () => {
    if (!initialData) return;
    const confirmMsg =
      lang === 'hi'
        ? `चेतावनी: क्या आप सच में ${initialData.student_name} (क्रमांक: ${initialData.roll_no}) का नाम हमेशा के लिए हटाना चाहते हैं?\n(यह विकल्प केवल गलत या डुप्लिकेट प्रविष्टि के लिए है)`
        : `Warning: Are you sure you want to permanently delete ${initialData.student_name} (Roll: ${initialData.roll_no})?\n(This completely removes all records)`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      await apiRequest(`/students/${initialData.id}`, { method: 'DELETE' });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error deleting student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-6">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserPlus size={20} className="text-blue-200" />
            <h3 className="text-lg font-black tracking-tight">
              {isEditing
                ? lang === 'hi'
                  ? 'विद्यार्थी विवरण बदलें (Edit Student)'
                  : 'Edit Student Details'
                : lang === 'hi'
                ? 'नया बच्चा जोड़ें (Add New Student)'
                : 'Add New Student'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-bold text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Class, Session & Roll No */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? '1. कक्षा (Class)' : '1. Class'}
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-bold text-slate-800"
              >
                {CLASSES_LIST.map((c) => (
                  <option key={c} value={c}>
                    {getClassLabel(c, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? '2. सत्र (Session)' : '2. Session'}
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-bold text-slate-800"
              >
                {SESSIONS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? '3. क्रमांक (Roll No)' : '3. Roll No'}
              </label>
              <input
                type="number"
                placeholder={lang === 'hi' ? 'स्वतः जुड़ेगा' : 'Auto'}
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
              />
            </div>
          </div>

          {/* Row 2: Student Name & Father's Name (Typed in English) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? '4. विद्यार्थी का नाम (English में)' : '4. Student Name (in English)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul, Janhvi, Saumya"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? '5. पिता का नाम (English में)' : "5. Father's Name (in English)"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vikas Kumar, Manjeet"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
              />
            </div>
          </div>

          {/* Row 3: Village & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  {lang === 'hi' ? '6. पता-गाँव (Village)' : '6. Village / Address'} <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomVillage(!isCustomVillage)}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  {isCustomVillage
                    ? lang === 'hi' ? 'सूची से चुनें' : 'Choose from list'
                    : lang === 'hi' ? '+ अन्य लिखें' : '+ Other'}
                </button>
              </div>
              {isCustomVillage ? (
                <input
                  type="text"
                  placeholder="Type village name in English..."
                  value={customVillage}
                  onChange={(e) => setCustomVillage(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                />
              ) : (
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold text-slate-800"
                >
                  {COMMON_VILLAGES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'hi' ? '7. मोबाइल नं. (10 Digits)' : '7. Mobile Number'}
              </label>
              <input
                type="tel"
                placeholder="e.g. 8189049338"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
              />
            </div>
          </div>

          {/* Row 4: Joining Month & Previous Class Due */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
            <div>
              <label className="block font-bold text-amber-900 mb-1">
                {lang === 'hi' ? '8. दाखिला माह (Joined Month)' : '8. Joining Month'}
              </label>
              <select
                value={joinedMonth}
                onChange={(e) => setJoinedMonth(e.target.value)}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 bg-white font-bold text-amber-900"
              >
                {ACADEMIC_MONTHS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {lang === 'hi' ? `${m.nameHi} (${m.nameEn})` : m.nameEn}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {lang === 'hi'
                  ? '* दाखिले से पहले के महीनों की फीस नहीं ली जाएगी'
                  : '* Uncharged before joining month'}
              </p>
            </div>

            <div>
              <label className="block font-bold text-amber-900 mb-1">
                {lang === 'hi' ? '9. पिछली कक्षा का बकाया (Old Due ₹)' : '9. Previous Class Due (₹)'}
              </label>
              <input
                type="number"
                min="0"
                value={previousClassDue}
                onChange={(e) => setPreviousClassDue(e.target.value)}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 font-mono font-bold text-amber-900"
                placeholder="0"
              />
              <p className="text-[11px] text-amber-700 mt-0.5">
                {lang === 'hi'
                  ? '* पुरानी कक्षा का बचा हुआ बकाया यहाँ दर्ज करें'
                  : '* Carried-forward dues from older class'}
              </p>
            </div>
          </div>

          {/* Row 5: Admission Fee Status */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>{lang === 'hi' ? '10. प्रवेश शुल्क स्थिति' : '10. Admission Fee Status'}</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-blue-900 font-extrabold text-[11px]">
                <input
                  type="checkbox"
                  checked={isFreeAdmission}
                  onChange={(e) => setIsFreeAdmission(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>{lang === 'hi' ? 'निःशुल्क (FREE Admission)' : 'FREE Admission'}</span>
              </label>
            </div>

            {!isFreeAdmission && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    {lang === 'hi' ? 'स्थिति (Status)' : 'Status'}
                  </label>
                  <select
                    value={admissionStatus}
                    onChange={(e) => setAdmissionStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-xs"
                  >
                    <option value="PAID">{lang === 'hi' ? 'जमा (PAID)' : 'PAID'}</option>
                    <option value="PENDING">{lang === 'hi' ? 'बाकी (PENDING)' : 'PENDING'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    {lang === 'hi' ? 'राशि (Amount ₹)' : 'Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    value={admissionAmount}
                    onChange={(e) => setAdmissionAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* If Editing, Show Student Management Actions (Mark Left vs Permanent Delete) */}
          {isEditing && initialData && (
            <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
              <span className="block font-bold text-xs text-slate-700 uppercase">
                {lang === 'hi' ? 'विद्यार्थी स्थिति एवं हटाने के विकल्प' : 'Student Status & Removal Options'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={isSubmitting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    status === 'ACTIVE'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {status === 'ACTIVE' ? (
                    <>
                      <UserMinus size={14} />
                      <span>{lang === 'hi' ? 'स्कूल छोड़ दिया (Mark Left / TC)' : 'Mark Left / TC'}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={14} />
                      <span>{lang === 'hi' ? 'पुनः सक्रिय करें (Mark Active)' : 'Mark Active'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDeletePermanently}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition ml-auto"
                >
                  <Trash2 size={14} />
                  <span>{lang === 'hi' ? 'हमेशा के लिए हटाएं (Delete)' : 'Delete Permanently'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'hi'
                  ? '• स्कूल छोड़ने पर बच्चे का पुराना रिकॉर्ड व बकाया सुरक्षित रहता है।\n• हमेशा के लिए हटाने पर सारा रिकॉर्ड मिट जाता है।'
                  : '• Mark Left preserves past receipts and unpaid dues. Permanent Delete wipes all records.'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition"
            >
              {t('close')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md transition"
            >
              {isSubmitting
                ? lang === 'hi'
                  ? 'सुरक्षित हो रहा है...'
                  : 'Saving...'
                : lang === 'hi'
                ? 'सुरक्षित करें (Save Student)'
                : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
