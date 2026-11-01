import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage, LanguageProvider } from './hooks/useLanguage';
import { Student, FeeStructure, ReceiptData, UserRole } from './types';
import { CLASSES_LIST, SESSIONS_LIST, getClassShortLabel } from './utils/constants';
import { apiRequest } from './services/api';
import { PinLoginScreen } from './components/PinLoginScreen';
import { RegisterGrid } from './components/RegisterGrid';
import { PayFeeModal } from './components/PayFeeModal';
import { ReceiptModal } from './components/ReceiptModal';
import { StudentFormModal } from './components/StudentFormModal';
import { StudentHistoryModal } from './components/StudentHistoryModal';
import { ClassPromotionTab } from './components/ClassPromotionTab';
import { FeeStructureEditor } from './components/FeeStructureEditor';
import { ReportsAndDuesView } from './components/ReportsAndDuesView';
import { ExcelExportView } from './components/ExcelExportView';
import { SettingsModal } from './components/SettingsModal';
import {
  School,
  Search,
  UserPlus,
  BookOpen,
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  Sparkles,
  Calendar,
  Filter,
  Settings,
} from 'lucide-react';

function MainApp() {
  const { lang, toggleLang, t } = useLanguage();

  // Authentication State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(() => {
    try {
      const saved = localStorage.getItem('svss_role');
      if (saved === 'COLLECTOR' || saved === 'ADMIN') return saved;
    } catch {}
    return null;
  });

  // Admin Active Tab
  const [adminTab, setAdminTab] = useState<
    'register' | 'promote' | 'fees' | 'reports' | 'export'
  >('register');

  // Selected Class, Session, Status Filter & Search Query
  const [selectedClass, setSelectedClass] = useState<string>('Class 6');
  const [selectedSession, setSelectedSession] = useState<string>('2026-27');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'LEFT' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [activePayStudent, setActivePayStudent] = useState<Student | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleLogin = (role: UserRole) => {
    setCurrentUserRole(role);
    try {
      localStorage.setItem('svss_role', role);
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    try {
      localStorage.removeItem('svss_role');
    } catch {}
  };

  // Load students for current class & session
  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.set('class_name', selectedClass);
      if (selectedSession) params.set('academic_year', selectedSession);
      if (selectedStatus) params.set('status', selectedStatus);

      const res = await apiRequest<{ students: Student[] }>(`/students?${params.toString()}`);
      setStudents(res.students || []);
    } catch (e: any) {
      console.error('Error loading students:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load fee structures
  const loadFeeStructures = async () => {
    try {
      const res = await apiRequest<{ fee_structures: FeeStructure[] }>('/fee-structures');
      setFeeStructures(res.fee_structures || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentUserRole) {
      loadStudents();
      loadFeeStructures();
    }
  }, [currentUserRole, selectedClass, selectedSession, selectedStatus]);

  // View receipt by receipt number
  const handleViewReceiptByNo = async (receiptNo: string) => {
    try {
      const res = await apiRequest<{ receipt: ReceiptData }>(`/receipts/${receiptNo}`);
      if (res.receipt) {
        setActiveReceipt(res.receipt);
      }
    } catch (e: any) {
      alert(e.message || 'Receipt not found');
    }
  };

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        s.father_name.toLowerCase().includes(q) ||
        s.village.toLowerCase().includes(q) ||
        s.mobile.includes(q) ||
        String(s.roll_no).includes(q)
    );
  }, [students, searchQuery]);

  const currentFeeStructure = feeStructures.find((f) => f.class_name === selectedClass);

  if (!currentUserRole) {
    return <PinLoginScreen onLoginSuccess={handleLogin} />;
  }

  const isAdmin = currentUserRole === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Banner & Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* School Name & Subtitle */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="SVSS Logo"
              className="w-11 h-11 rounded-full object-contain bg-white p-0.5 shadow-md shrink-0 border border-amber-500/30"
            />
            <div>
              <h1 className="font-black text-sm md:text-base tracking-tight leading-none text-white">
                {t('schoolName')}
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 leading-none">{t('schoolSub')}</p>
            </div>
          </div>

          {/* Right Controls: Role, Language Toggle, Logout */}
          <div className="flex items-center gap-2">
            {/* Role Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                isAdmin ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {isAdmin ? t('adminRole') : t('collectorRole')}
            </span>

            {/* 1-Click Language Switcher */}
            <button
              onClick={toggleLang}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 transition active:scale-95"
              title="1-Click Language Toggle (हिंदी / English)"
            >
              {lang === 'hi' ? 'English में देखें' : 'हिंदी में देखें'}
            </button>

            {/* Admin Settings Wheel (Change Password / PIN) */}
            {isAdmin && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition active:rotate-45"
                title={lang === 'hi' ? 'सेटिंग्स एवं पासवर्ड बदलें' : 'Settings & Change PIN'}
              >
                <Settings size={18} className="hover:rotate-90 transition-transform duration-300" />
              </button>
            )}

            {/* Switch Role / Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
              title={t('switchRole')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        {isAdmin && (
          <div className="bg-slate-800/90 border-t border-slate-700/80 px-4">
            <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1">
              <button
                onClick={() => setAdminTab('register')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition whitespace-nowrap ${
                  adminTab === 'register'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen size={15} />
                <span>{t('viewRegister')}</span>
              </button>

              {/* FEATURE 2: 1-Click Class Promotion Tab */}
              <button
                onClick={() => setAdminTab('promote')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition whitespace-nowrap ${
                  adminTab === 'promote'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles size={15} className="text-amber-300" />
                <span>{t('promoteClass')}</span>
              </button>

              <button
                onClick={() => setAdminTab('fees')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition whitespace-nowrap ${
                  adminTab === 'fees'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <DollarSign size={15} />
                <span>{t('manageFees')}</span>
              </button>

              <button
                onClick={() => setAdminTab('reports')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition whitespace-nowrap ${
                  adminTab === 'reports'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 size={15} />
                <span>{t('reports')}</span>
              </button>

              <button
                onClick={() => setAdminTab('export')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition whitespace-nowrap ${
                  adminTab === 'export'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileSpreadsheet size={15} />
                <span>{t('exportExcel')}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="max-w-7xl w-full mx-auto p-3 md:p-4 flex-1">
        {/* Register Grid View (Shown for Collector always, and Admin on Register Tab) */}
        {(!isAdmin || adminTab === 'register') && (
          <div className="space-y-3">
            {/* Top Controls: Class Selector Buttons, Session Dropdown, Status Filter, Search & Add Student */}
            <div className="bg-white/95 backdrop-blur-md p-3 md:p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5 sticky top-[54px] md:top-[58px] z-20">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Class Selector Buttons (LKG to Class 12) */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
                  {CLASSES_LIST.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap shadow-2xs ${
                        selectedClass === cls
                          ? 'bg-orange-600 text-white shadow-xs scale-102'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                      }`}
                    >
                      {getClassShortLabel(cls)}
                    </button>
                  ))}
                </div>

                {/* Session Switcher & Status Filter */}
                <div className="flex items-center gap-2 text-xs">
                  {/* Session Dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
                    <Calendar size={13} className="text-slate-500" />
                    <span className="font-semibold text-slate-600">{lang === 'hi' ? 'सत्र:' : 'Session:'}</span>
                    <select
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 focus:outline-none"
                    >
                      {SESSIONS_LIST.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option value="ALL">{lang === 'hi' ? 'सभी सत्र' : 'All Sessions'}</option>
                    </select>
                  </div>

                  {/* Status Filter (Active vs Left / TC) */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
                    <Filter size={13} className="text-slate-500" />
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as any)}
                      className="bg-transparent font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="ACTIVE">{t('activeStudents')}</option>
                      <option value="LEFT">{t('leftStudents')}</option>
                      <option value="ALL">{t('allStudents')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Search Bar & Add Student Button */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-7 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-orange-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadStudents}
                    className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                    title={lang === 'hi' ? 'ताज़ा करें' : 'Refresh'}
                  >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  </button>

                  {/* Prominent "+ Add New Student" Button */}
                  <button
                    onClick={() => {
                      setEditingStudent(null);
                      setShowStudentForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95"
                  >
                    <UserPlus size={14} />
                    <span>{t('addStudent')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Digital Register Grid */}
            <RegisterGrid
              students={filteredStudents}
              onPayFee={(student) => setActivePayStudent(student)}
              onViewReceipt={(receipt) => setActiveReceipt(receipt)}
              onSelectStudentHistory={(student) => setHistoryStudent(student)}
              onEditStudent={(student) => {
                setEditingStudent(student);
                setShowStudentForm(true);
              }}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* Admin Tab: Class Promotion (अगली कक्षा में भेजें) */}
        {isAdmin && adminTab === 'promote' && <ClassPromotionTab />}

        {/* Admin Tab: Manage Fee Structure */}
        {isAdmin && adminTab === 'fees' && <FeeStructureEditor />}

        {/* Admin Tab: Reports & Pending Dues */}
        {isAdmin && adminTab === 'reports' && <ReportsAndDuesView />}

        {/* Admin Tab: Export to Excel/CSV */}
        {isAdmin && adminTab === 'export' && <ExcelExportView />}
      </main>

      {/* Pay Fee Modal */}
      {activePayStudent && (
        <PayFeeModal
          student={activePayStudent}
          feeStructure={currentFeeStructure}
          role={currentUserRole}
          onClose={() => setActivePayStudent(null)}
          onSuccess={(receipt) => {
            setActivePayStudent(null);
            setActiveReceipt(receipt);
            loadStudents();
          }}
        />
      )}

      {/* Receipt Modal (Prints & WhatsApp) */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Student Multi-Year Complete History Modal */}
      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
          onViewReceipt={(receiptNo) => handleViewReceiptByNo(receiptNo)}
          onEdit={() => {
            setEditingStudent(historyStudent);
            setHistoryStudent(null);
            setShowStudentForm(true);
          }}
          onRefresh={() => {
            loadStudents();
          }}
        />
      )}

      {/* Student Add / Edit Modal */}
      {showStudentForm && (
        <StudentFormModal
          initialData={editingStudent}
          defaultClass={selectedClass}
          defaultSession={selectedSession === 'ALL' ? '2026-27' : selectedSession}
          onClose={() => {
            setShowStudentForm(false);
            setEditingStudent(null);
          }}
          onSuccess={() => {
            setShowStudentForm(false);
            setEditingStudent(null);
            loadStudents();
          }}
        />
      )}

      {/* Admin Settings Wheel Modal (Change PINs / Passwords) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
