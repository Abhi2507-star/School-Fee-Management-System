import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useAcademicSession } from '../hooks/useAcademicSession';
import {
  buildSessionScopedUrl,
  EMPTY_STRUCTURED_SEARCH_CRITERIA,
  StructuredStudentSearchCriteria,
  getStudentAutocompleteSuggestions,
  buildAutoFillCriteriaFromStudent,
  validateStudentRegistrationInput,
} from '../utils/workflows';

interface StudentsPageProps {
  selectedAcademicYearId?: string;
  userRoles?: string[];
}

interface AcademicYearOption {
  id: string;
  code: string;
  name: string;
  isCurrent: boolean;
}

export function StudentsPage({ selectedAcademicYearId: propYearId, userRoles: propRoles }: StudentsPageProps = {}) {
  const { user } = useAuth();
  const { selectedAcademicYearId: sessionYearId } = useAcademicSession();
  const selectedAcademicYearId = propYearId || sessionYearId || '';
  const userRoles = propRoles || user?.roles || [];
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<StructuredStudentSearchCriteria>({
    ...EMPTY_STRUCTURED_SEARCH_CRITERIA,
  });
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Autocomplete suggestion dropdown states
  const [activeDropdownField, setActiveDropdownField] = useState<'studentName' | 'fatherName' | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Exact 8-field Student Registration Form state
  const [newStudentForm, setNewStudentForm] = useState({
    admissionNumber: '',
    fullName: '',
    guardianName: '',
    primaryContactNumber: '',
    address: '',
    classId: '',
    sectionId: '',
    academicYearId: selectedAcademicYearId || '',
  });

  // Configurable Academic Session form state
  const [newSessionForm, setNewSessionForm] = useState({
    code: '',
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  const canWrite = userRoles.includes('ADMINISTRATOR') || userRoles.includes('ACCOUNTANT');

  async function loadClassesAndSessions() {
    try {
      const [clsRes, yrRes] = await Promise.all([
        apiRequest<{ classes: any[] }>('/academics/classes'),
        apiRequest<{ academicYears: AcademicYearOption[] }>('/academics/academic-years'),
      ]);
      setClasses(clsRes.classes);
      setAcademicYears(yrRes.academicYears);

      const defaultYearId =
        selectedAcademicYearId ||
        yrRes.academicYears.find((y) => y.isCurrent)?.id ||
        yrRes.academicYears[0]?.id ||
        '';

      if (clsRes.classes.length > 0) {
        const firstClass = clsRes.classes[0];
        setNewStudentForm((prev) => ({
          ...prev,
          classId: prev.classId || firstClass.id,
          sectionId: prev.sectionId || firstClass.sections?.[0]?.id || '',
          academicYearId: prev.academicYearId || defaultYearId,
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function loadStudents(overrideCriteria?: StructuredStudentSearchCriteria) {
    const active = overrideCriteria || searchCriteria;
    try {
      const url = buildSessionScopedUrl('/students', selectedAcademicYearId, {
        studentName: active.studentName.trim() || undefined,
        fatherName: active.fatherName.trim() || undefined,
        classId: active.classValue || undefined,
        sectionId: active.sectionValue || undefined,
        status: statusFilter || undefined,
      });
      const res = await apiRequest<{ students: any[] }>(url);
      setStudents(res.students);
      if (res.students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(res.students[0].id);
      } else if (res.students.length === 0) {
        setSelectedStudentId(null);
        setProfile(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function loadStudentProfile(studentId: string) {
    try {
      const url = buildSessionScopedUrl(`/students/${studentId}/profile`, selectedAcademicYearId);
      const res = await apiRequest<any>(url);
      setProfile(res);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  useEffect(() => {
    loadClassesAndSessions();
  }, []);

  useEffect(() => {
    loadStudents();
    if (selectedAcademicYearId) {
      setNewStudentForm((prev) => ({ ...prev, academicYearId: selectedAcademicYearId }));
    }
  }, [selectedAcademicYearId, statusFilter]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentProfile(selectedStudentId);
    }
  }, [selectedStudentId, selectedAcademicYearId]);

  const selectedClassForFilter = classes.find((c) => c.id === searchCriteria.classValue);
  const filterSections = selectedClassForFilter?.sections || [];

  const normalizedDirectoryStudents = students.map((st) => ({
    id: st.id,
    admissionNumber: st.admissionNumber,
    fullName: st.fullName,
    guardianName: st.guardianName,
    primaryContactNumber: st.primaryContactNumber,
    className: st.currentEnrollment?.className || '',
    section: st.currentEnrollment?.sectionName || '',
    classId: st.currentEnrollment?.classId || '',
    sectionId: st.currentEnrollment?.sectionId || '',
    status: st.status,
  }));

  const currentSuggestions = activeDropdownField
    ? getStudentAutocompleteSuggestions(
        normalizedDirectoryStudents,
        activeDropdownField,
        activeDropdownField === 'fatherName' ? searchCriteria.fatherName : searchCriteria.studentName,
        searchCriteria
      )
    : [];

  function handleSelectSuggestion(item: (typeof normalizedDirectoryStudents)[number]) {
    const autoFilled = buildAutoFillCriteriaFromStudent(item);
    setSearchCriteria(autoFilled);
    setActiveDropdownField(null);
    setSelectedStudentId(item.id);
    loadStudents(autoFilled);
  }

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validateStudentRegistrationInput(
      {
        admissionNumber: newStudentForm.admissionNumber,
        fullName: newStudentForm.fullName,
        guardianName: newStudentForm.guardianName,
        primaryContactNumber: newStudentForm.primaryContactNumber,
        address: newStudentForm.address,
        classValue: newStudentForm.classId,
        sectionValue: newStudentForm.sectionId,
        academicSession: newStudentForm.academicYearId,
      },
      students.map((s) => ({ id: s.id, admissionNumber: s.admissionNumber }))
    );

    if (!validation.valid) {
      setErrorMsg(validation.messageEn || 'Please complete all 8 required student registration fields.');
      return;
    }

    try {
      const created = await apiRequest<{ student: { id: string; admissionNumber: string; fullName: string } }>(
        '/students',
        {
          method: 'POST',
          body: JSON.stringify({
            admissionNumber: newStudentForm.admissionNumber.trim(),
            fullName: newStudentForm.fullName.trim(),
            guardianName: newStudentForm.guardianName.trim(),
            primaryContactNumber: newStudentForm.primaryContactNumber.trim(),
            address: newStudentForm.address.trim(),
            classId: newStudentForm.classId,
            sectionId: newStudentForm.sectionId,
            academicYearId: newStudentForm.academicYearId,
          }),
        }
      );

      setShowNewModal(false);
      setNewStudentForm((prev) => ({
        ...prev,
        admissionNumber: '',
        fullName: '',
        guardianName: '',
        primaryContactNumber: '',
        address: '',
      }));
      await loadStudents();
      if (created?.student?.id) {
        setSelectedStudentId(created.student.id);
      }
      setSuccessMsg(
        `Saved student ${created.student.fullName} (${created.student.admissionNumber}). Student is now listed below and available for fee submission.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleCreateAcademicSession(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const code = newSessionForm.code.trim();
      const startYear = Number(code.slice(0, 4)) || 2027;
      const res = await apiRequest<{ academicYear: AcademicYearOption }>('/academics/academic-years', {
        method: 'POST',
        body: JSON.stringify({
          code,
          name: newSessionForm.name.trim() || `Academic Session ${code}`,
          startDate: newSessionForm.startDate || `${startYear}-04-01`,
          endDate: newSessionForm.endDate || `${startYear + 1}-03-31`,
          isCurrent: newSessionForm.isCurrent,
        }),
      });
      await loadClassesAndSessions();
      setNewStudentForm((prev) => ({ ...prev, academicYearId: res.academicYear.id }));
      setShowSessionModal(false);
      setNewSessionForm({ code: '', name: '', startDate: '', endDate: '', isCurrent: false });
      setSuccessMsg(`Added configurable academic session ${res.academicYear.code}.`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handlePurgeDummyStudents() {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiRequest<{ removedCount: number; removedAdmissionNumbers: string[] }>(
        '/students/dummy-records',
        { method: 'DELETE' }
      );
      await loadStudents();
      setSuccessMsg(
        `Safely removed ${res.removedCount} dummy test student record(s) while preserving school settings, academic sessions, fee structures, and staff user accounts.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  const selectedClassForNew = classes.find((c) => c.id === newStudentForm.classId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">विद्यार्थी पंजीकरण और सूची (Student Registration &amp; Directory)</h2>
          <p className="text-xs text-slate-500">
            Register students with the 8 required fields, manage configurable academic sessions, and submit fees immediately
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSessionModal(!showSessionModal)}
              className="border border-blue-900 text-blue-900 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold"
            >
              + नया शैक्षणिक सत्र (Add Academic Session)
            </button>
            <button
              type="button"
              onClick={() => setShowNewModal(!showNewModal)}
              className="bg-blue-900 hover:bg-blue-800 text-white px-3.5 py-1.5 rounded text-xs font-bold"
            >
              + नया विद्यार्थी पंजीकरण (+ Register New Student)
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-300 rounded text-xs text-red-800 font-semibold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 font-semibold">
          {successMsg}
        </div>
      )}

      {/* Configurable Academic Session Form (Admin) */}
      {showSessionModal && canWrite && (
        <form
          onSubmit={handleCreateAcademicSession}
          className="bg-white p-4 rounded border-2 border-slate-300 space-y-3 text-xs"
        >
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-slate-900">नया शैक्षणिक सत्र जोड़ें (Configure Academic Session)</h3>
            <button type="button" onClick={() => setShowSessionModal(false)} className="text-slate-500 font-bold">
              Close ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold mb-1">Session Code (YYYY-YY) *</label>
              <input
                type="text"
                required
                placeholder="e.g. 2027-28"
                value={newSessionForm.code}
                onChange={(e) => setNewSessionForm({ ...newSessionForm, code: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Session Label *</label>
              <input
                type="text"
                required
                placeholder="e.g. Academic Session 2027–28"
                value={newSessionForm.name}
                onChange={(e) => setNewSessionForm({ ...newSessionForm, name: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={newSessionForm.startDate}
                onChange={(e) => setNewSessionForm({ ...newSessionForm, startDate: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">End Date *</label>
              <input
                type="date"
                required
                value={newSessionForm.endDate}
                onChange={(e) => setNewSessionForm({ ...newSessionForm, endDate: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-900 text-white px-4 py-1.5 rounded font-bold">
              Save Academic Session
            </button>
          </div>
        </form>
      )}

      {/* 8-Field Student Registration Form */}
      {showNewModal && canWrite && (
        <form
          id="newStudentRegistrationForm"
          onSubmit={handleCreateStudent}
          className="bg-white p-4 rounded border-2 border-blue-900 space-y-3 text-xs"
        >
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-blue-900">
              नया विद्यार्थी पंजीकरण फ़ॉर्म (Student Registration Form)
            </h3>
            <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-500 font-bold">
              Close ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold mb-1">
                1. Registration / Admission Number (पंजीकरण / प्रवेश संख्या) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SVSS/2026/101"
                value={newStudentForm.admissionNumber}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, admissionNumber: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">2. Student Name (विद्यार्थी का नाम) *</label>
              <input
                type="text"
                required
                placeholder="Student Full Name"
                value={newStudentForm.fullName}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, fullName: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">3. Father&apos;s Name (पिता का नाम) *</label>
              <input
                type="text"
                required
                placeholder="Father's Name"
                value={newStudentForm.guardianName}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, guardianName: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">
                4. Guardian&apos;s Mobile Number (अभिभावक का मोबाइल नंबर) *
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit Mobile Number"
                value={newStudentForm.primaryContactNumber}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, primaryContactNumber: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">5. Address (पता) *</label>
              <input
                type="text"
                required
                placeholder="Village/Post, Kadipur, Sultanpur"
                value={newStudentForm.address}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, address: e.target.value })}
                className="w-full border rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">6. Class (कक्षा) *</label>
              <select
                required
                value={newStudentForm.classId}
                onChange={(e) => {
                  const cls = classes.find((c) => c.id === e.target.value);
                  setNewStudentForm({
                    ...newStudentForm,
                    classId: e.target.value,
                    sectionId: cls?.sections?.[0]?.id || '',
                  });
                }}
                className="w-full border rounded px-2 py-1.5 bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">7. Section (सेक्शन) *</label>
              <select
                required
                value={newStudentForm.sectionId}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, sectionId: e.target.value })}
                className="w-full border rounded px-2 py-1.5 bg-white"
              >
                {(selectedClassForNew?.sections || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    Sec {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">8. Academic Session (शैक्षणिक सत्र) *</label>
              <select
                required
                value={newStudentForm.academicYearId}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, academicYearId: e.target.value })}
                className="w-full border rounded px-2 py-1.5 bg-white"
              >
                {academicYears.map((yr) => (
                  <option key={yr.id} value={yr.id}>
                    {yr.code} ({yr.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded font-bold">
              विद्यार्थी सुरक्षित करें (Save Student)
            </button>
          </div>
        </form>
      )}

      {/* Reused Structured Student Search Component */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadStudents();
        }}
        className="bg-white p-3.5 rounded border border-slate-200 space-y-3 text-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <span className="font-extrabold uppercase text-blue-900">Student Search &amp; Filter</span>
          <span className="text-[11px] text-slate-500">
            Filter by any single field or any combination of Student Name, Father&apos;s Name, Class, or Section
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <label htmlFor="dirStudentNameInput" className="block font-bold text-slate-700 mb-1">
              Student Name / Adm No
            </label>
            <input
              id="dirStudentNameInput"
              type="text"
              autoComplete="off"
              value={searchCriteria.studentName}
              onFocus={() => {
                setActiveDropdownField('studentName');
                setHighlightedIndex(0);
              }}
              onBlur={() => {
                setTimeout(() => setActiveDropdownField((prev) => (prev === 'studentName' ? null : prev)), 150);
              }}
              onChange={(e) => {
                setSearchCriteria((prev) => ({ ...prev, studentName: e.target.value }));
                setActiveDropdownField('studentName');
                setHighlightedIndex(0);
              }}
              placeholder="Type name or Adm No for suggestions..."
              className="w-full border border-slate-300 rounded px-2.5 py-1.5"
            />
            {activeDropdownField === 'studentName' && currentSuggestions.length > 0 && (
              <div
                role="listbox"
                aria-label="Directory Student Name Suggestions"
                className="absolute left-0 right-0 sm:w-80 top-full mt-1 bg-white border border-slate-300 rounded shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100"
              >
                {currentSuggestions.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    role="option"
                    aria-selected={idx === highlightedIndex}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      handleSelectSuggestion(st);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 ${
                      idx === highlightedIndex ? 'bg-blue-50 border-l-4 border-l-blue-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {st.fullName} <span className="font-mono text-[10px] text-blue-900">({st.admissionNumber})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">Father: {st.guardianName}</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 shrink-0">Auto-Fill ↵</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label htmlFor="dirFatherNameInput" className="block font-bold text-slate-700 mb-1">
              Father&apos;s Name
            </label>
            <input
              id="dirFatherNameInput"
              type="text"
              autoComplete="off"
              value={searchCriteria.fatherName}
              onFocus={() => {
                setActiveDropdownField('fatherName');
                setHighlightedIndex(0);
              }}
              onBlur={() => {
                setTimeout(() => setActiveDropdownField((prev) => (prev === 'fatherName' ? null : prev)), 150);
              }}
              onChange={(e) => {
                setSearchCriteria((prev) => ({ ...prev, fatherName: e.target.value }));
                setActiveDropdownField('fatherName');
                setHighlightedIndex(0);
              }}
              placeholder="Type father's name..."
              className="w-full border border-slate-300 rounded px-2.5 py-1.5"
            />
          </div>
          <div>
            <label htmlFor="dirClassFilter" className="block font-bold text-slate-700 mb-1">
              Class
            </label>
            <select
              id="dirClassFilter"
              value={searchCriteria.classValue}
              onChange={(e) =>
                setSearchCriteria((prev) => ({
                  ...prev,
                  classValue: e.target.value,
                  sectionValue: '',
                }))
              }
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              <option value="">All Classes (LKG – Class 12)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dirSectionFilter" className="block font-bold text-slate-700 mb-1">
              Section
            </label>
            <select
              id="dirSectionFilter"
              value={searchCriteria.sectionValue}
              onChange={(e) => setSearchCriteria((prev) => ({ ...prev, sectionValue: e.target.value }))}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              <option value="">All Sections</option>
              {filterSections.map((sec: any) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dirStatusFilter" className="block font-bold text-slate-700 mb-1">
              Status
            </label>
            <select
              id="dirStatusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PROMOTED">PROMOTED</option>
              <option value="TRANSFERRED">TRANSFERRED</option>
              <option value="WITHDRAWN">WITHDRAWN</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              const reset = { ...EMPTY_STRUCTURED_SEARCH_CRITERIA };
              setSearchCriteria(reset);
              setStatusFilter('');
              loadStudents(reset);
            }}
            className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded font-semibold text-slate-700"
          >
            Reset
          </button>
          <button type="submit" className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-1.5 rounded font-bold">
            Search
          </button>
        </div>
      </form>

      <div className="bg-white rounded border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b text-slate-700">
              <th className="p-2.5 text-left">Admission No</th>
              <th className="p-2.5 text-left">Student Name</th>
              <th className="p-2.5 text-left">Father&apos;s Name &amp; Mobile</th>
              <th className="p-2.5 text-left">Class &amp; Sec</th>
              <th className="p-2.5 text-left">Session</th>
              <th className="p-2.5 text-right">Net Payable</th>
              <th className="p-2.5 text-right">Cleared Paid</th>
              <th className="p-2.5 text-right">Outstanding</th>
              <th className="p-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b hover:bg-slate-50">
                <td className="p-2.5 font-mono font-bold text-blue-900">{s.admissionNumber}</td>
                <td className="p-2.5 font-semibold">{s.fullName}</td>
                <td className="p-2.5">
                  {s.guardianName} ({s.primaryContactNumber})
                </td>
                <td className="p-2.5">
                  {s.currentEnrollment
                    ? `${s.currentEnrollment.className}-${s.currentEnrollment.sectionName}`
                    : 'Unenrolled'}
                </td>
                <td className="p-2.5 font-mono">
                  {s.currentEnrollment?.academicYearCode || '—'}
                </td>
                <td className="p-2.5 text-right font-mono tabular-nums">₹{s.ledgerSummary.totalNetPayable}</td>
                <td className="p-2.5 text-right font-mono tabular-nums text-emerald-700">
                  ₹{s.ledgerSummary.totalClearedPaid}
                </td>
                <td className="p-2.5 text-right font-mono tabular-nums font-bold text-orange-600">
                  ₹{s.ledgerSummary.totalOutstanding}
                </td>
                <td className="p-2.5 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(s.id)}
                    className="text-blue-900 font-bold underline"
                  >
                    Inspect Ledger
                  </button>
                  <Link
                    to={`/collect?studentId=${encodeURIComponent(s.id)}`}
                    className="text-orange-600 font-bold underline"
                  >
                    फीस जमा करें (Collect Fee)
                  </Link>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500">
                  No student records found. Click &quot;+ Register New Student&quot; above to enter student data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 9-Tab Student Profile Inspector */}
      {profile && (
        <div className="bg-white rounded border-2 border-slate-300 overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
            <span className="text-sm font-extrabold text-blue-900">
              {profile.overview.fullName} ({profile.overview.admissionNumber}) — Outstanding: ₹
              {profile.ledger.totalOutstandingBalance}
            </span>
          </div>
          <div className="flex flex-wrap border-b bg-slate-50 px-2 pt-1 text-xs">
            {[
              ['overview', '1. Overview'],
              ['academic', '2. Academic History'],
              ['outstanding', '3. Outstanding Fees'],
              ['payments', '4. Payment History'],
              ['concessions', '5. Concessions'],
              ['refunds', '6. Refunds & Reversals'],
              ['audit', '7. Audit History'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-3 py-2 font-bold border-b-2 ${
                  activeTab === key ? 'border-orange-600 text-blue-900' : 'border-transparent text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-4 text-xs">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded border">
                  <strong>Admission No:</strong> {profile.overview.admissionNumber}
                </div>
                <div className="p-3 bg-slate-50 rounded border">
                  <strong>Father&apos;s Name:</strong> {profile.overview.guardianName}
                </div>
                <div className="p-3 bg-slate-50 rounded border">
                  <strong>Guardian Mobile:</strong> {profile.overview.primaryContactNumber}
                </div>
                <div className="p-3 bg-slate-50 rounded border sm:col-span-2">
                  <strong>Address:</strong> {profile.overview.address}
                </div>
                <div className="p-3 bg-slate-50 rounded border">
                  <strong>Advance Credit:</strong> ₹{profile.overview.advanceCreditBalance}
                </div>
              </div>
            )}
            {activeTab === 'academic' && (
              <div className="space-y-1.5">
                {profile.academicHistory.map((e: any) => (
                  <div key={e.id} className="p-2 border rounded flex justify-between">
                    <span>
                      <strong>{e.academicYear.code}</strong>: {e.schoolClass.name} - Sec {e.section.name}
                    </span>
                    <span className="font-bold text-emerald-700">{e.status}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'outstanding' && (
              <div className="space-y-1.5">
                {profile.ledger.charges.map((c: any) => (
                  <div key={c.id} className="p-2 border rounded flex justify-between">
                    <span>
                      <strong>{c.feeHeadName}</strong> ({c.feePeriodLabel}) — Due: {c.dueDate}
                    </span>
                    <span className="font-mono font-bold text-orange-600">Outstanding: ₹{c.outstandingAmount}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'payments' && (
              <div className="space-y-1.5">
                {profile.payments.map((p: any) => (
                  <div key={p.id} className="p-2 border rounded flex justify-between">
                    <span className="font-mono font-bold text-blue-900">
                      {p.receiptNumber} ({p.paymentMethod})
                    </span>
                    <span className="font-mono font-bold">
                      ₹{p.amountReceived} — {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'concessions' && (
              <div className="space-y-1.5">
                {profile.concessions.map((c: any) => (
                  <div key={c.id} className="p-2 border rounded flex justify-between">
                    <span>
                      {c.schemeName}: {c.reason}
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{c.approvedAmount} ({c.status})
                    </span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'refunds' && (
              <div className="space-y-1.5">
                {profile.refunds.map((rf: any) => (
                  <div key={rf.id} className="p-2 border rounded flex justify-between">
                    <span>
                      {rf.refundMethod}: {rf.reason}
                    </span>
                    <span className="font-mono font-bold">
                      ₹{rf.refundAmount} ({rf.status})
                    </span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'audit' && (
              <div className="space-y-1.5">
                {profile.auditHistory.map((a: any) => (
                  <div key={a.id} className="p-2 border rounded flex justify-between">
                    <span>
                      <strong>[{a.action}]</strong> {a.summary}
                    </span>
                    <span className="text-slate-500">{a.actorUsername}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
