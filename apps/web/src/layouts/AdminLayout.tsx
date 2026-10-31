import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, IndianRupee, FileSpreadsheet, Receipt,
  ShieldCheck, Settings, Search, LogOut, CheckCircle2, AlertTriangle, Loader2, HelpCircle, Globe
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAcademicSession } from '../hooks/useAcademicSession';
import { useLanguage } from '../hooks/useLanguage';
import { apiRequest } from '../services/api';
import { formatISTDate } from '../utils/format';
import { formatRoleLabel, resolveTwoRoleMode } from '../utils/workflows';

interface HealthStatusResponse {
  status: 'HEALTHY' | 'DEGRADED';
  database: string;
  providerMode?: string;
  lastSuccessfulBackupAt: string | null;
  timestamp: string;
}

export const AdminLayout: React.FC<{
  title: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, breadcrumbs = [], actions, children }) => {
  const { user, loading, logout } = useAuth();
  const { academicYears, selectedAcademicYearId, setSelectedAcademicYearId, selectedAcademicYear } = useAcademicSession();
  const { lang, toggleLang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState(searchParams.get('q') || '');
  const [showGlobalSuggestions, setShowGlobalSuggestions] = useState(false);
  const [globalHighlightedIndex, setGlobalHighlightedIndex] = useState(-1);

  const roleMode = resolveTwoRoleMode(user?.roles || []);
  const isAdmin = !loading && roleMode === 'ADMIN';

  useEffect(() => {
    if (location.pathname === '/students') {
      setGlobalQuery(searchParams.get('q') || '');
    }
  }, [location.pathname, searchParams]);

  const { data: globalSuggestionsData } = useQuery({
    queryKey: ['global-search-students', globalQuery.trim()],
    queryFn: () => {
      const q = globalQuery.trim();
      if (!q) return { students: [] };
      return apiRequest<{ students: any[] }>(`/students?q=${encodeURIComponent(q)}&status=ACTIVE`);
    },
    enabled: globalQuery.trim().length >= 1,
    staleTime: 30000,
  });

  const globalSuggestions = (globalSuggestionsData?.students || []).slice(0, 8);

  useEffect(() => {
    const suppressInjectedOverlay = () => {
      const candidates = document.querySelectorAll('button, a, div, aside, iframe');
      candidates.forEach((el) => {
        const text = (el.textContent || '').trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        const titleAttr = (el.getAttribute('title') || '').trim();
        if (
          /^ask gemini$/i.test(text) ||
          /ask gemini/i.test(aria) ||
          /ask gemini/i.test(titleAttr)
        ) {
          (el as HTMLElement).style.setProperty('display', 'none', 'important');
        }
      });
    };
    suppressInjectedOverlay();
    const observer = new MutationObserver(suppressInjectedOverlay);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const {
    data: healthData,
    isLoading: isCheckingHealth,
    isError: isHealthError,
  } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiRequest<HealthStatusResponse>('/health/diagnostics'),
    refetchInterval: 30000,
    retry: false,
    enabled: isAdmin,
  });

  const dbStatus: 'Checking' | 'Connected' | 'Disconnected' | 'Unknown' = isCheckingHealth
    ? 'Checking'
    : isHealthError || healthData?.status === 'DEGRADED'
    ? 'Disconnected'
    : healthData?.status === 'HEALTHY'
    ? 'Connected'
    : 'Unknown';

  // Primary Everyday Tasks (Shown to both Admin & Fee Collector)
  const primaryNavItems = [
    { path: '/', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/students', label: t('findStudent'), icon: Users },
    { path: '/collect', label: t('feeCollection'), icon: IndianRupee },
    { path: '/receipts', label: t('reprintReceipt'), icon: Receipt },
    { path: '/reports', label: t('reports'), icon: FileSpreadsheet },
  ];

  // Administrative Sections (Strictly restricted to Admin — never shown to Fee Collector or while loading)
  const adminNavItems = isAdmin
    ? [
        { path: '/fee-structures', label: t('feeStructureAndCharges'), icon: FileSpreadsheet },
        { path: '/approvals', label: t('concessionsAndAdjustments'), icon: ShieldCheck },
        { path: '/admin', label: t('systemSettings'), icon: Settings },
      ]
    : [];

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowGlobalSuggestions(false);
    const trimmed = globalQuery.trim();
    if (!trimmed) return;
    navigate(`/students?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-64 bg-svss-navy text-white flex flex-col shrink-0 no-print">
        <div className="p-4 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-svss-saffron flex items-center justify-center font-bold text-white text-lg shrink-0">
              SV
            </div>
            <div>
              <h1 className="font-bold text-xs tracking-wide uppercase leading-tight">
                {lang === 'hi' ? 'स्वामी विवेकानंद शिक्षण संस्थान' : 'Swami Vivekanand Sikshan Sansthan'}
              </h1>
              <p className="text-[11px] text-blue-200 mt-0.5">
                {isAdmin
                  ? lang === 'hi'
                    ? 'प्रशासन पोर्टल'
                    : 'Admin Portal'
                  : lang === 'hi'
                  ? 'शुल्क संग्रह पटल'
                  : 'Fee Collector Counter'}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Core Everyday Workflows */}
        <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
          {lang === 'hi' ? 'दैनिक कार्य' : 'Daily Tasks'}
        </div>
        <nav className="flex lg:flex-col py-1 px-2 gap-1 overflow-x-auto" aria-label="Primary Navigation">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname === item.path && !location.search;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs lg:text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-svss-saffron text-white shadow-sm'
                    : 'text-blue-100 hover:bg-blue-800/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Administrative Sections — Shown ONLY to Admin */}
        {isAdmin && adminNavItems.length > 0 && (
          <div className="mt-2 pt-2 border-t border-blue-800/80 px-2">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
              {t('adminHeading')}
            </div>
            <nav className="flex lg:flex-col gap-0.5 overflow-x-auto" aria-label="Administrative Navigation">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const basePath = item.path.split('?')[0];
                const active =
                  location.pathname === basePath &&
                  location.search === (item.path.includes('?') ? `?${item.path.split('?')[1]}` : '');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-blue-800 text-white font-bold'
                        : 'text-blue-200 hover:bg-blue-800/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Database & Backup Diagnostics — Shown ONLY to Admin */}
        {isAdmin && (
          <div className="hidden lg:block mt-auto p-3 border-t border-blue-800 text-xs text-blue-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium">
              {dbStatus === 'Checking' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" />
                  <span className="text-blue-200">{t('loading')}</span>
                </>
              )}
              {dbStatus === 'Connected' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-300">
                    {lang === 'hi' ? 'डेटाबेस: जुड़ा हुआ है' : 'Database: Connected'}
                  </span>
                </>
              )}
              {dbStatus === 'Disconnected' && (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
                  <span className="text-red-300">
                    {lang === 'hi' ? 'डेटाबेस: संपर्क टूटा' : 'Database: Disconnected'}
                  </span>
                </>
              )}
              {dbStatus === 'Unknown' && (
                <>
                  <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-amber-300">
                    {lang === 'hi' ? 'डेटाबेस: अज्ञात' : 'Database: Unknown'}
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] text-blue-200">
              {healthData?.lastSuccessfulBackupAt
                ? `${lang === 'hi' ? 'अंतिम सत्यापित बैकअप' : 'Last Verified Backup'}: ${formatISTDate(healthData.lastSuccessfulBackupAt)}`
                : lang === 'hi'
                ? 'बैकअप: कोई सत्यापित रिकॉर्ड नहीं'
                : 'Backup: No verified backup record'}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="min-h-14 bg-white border-b border-slate-200 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3 no-print">
          <form onSubmit={handleGlobalSearchSubmit} className="relative flex-1 min-w-[220px] max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalQuery}
                autoComplete="off"
                onFocus={() => {
                  if (globalQuery.trim().length >= 1) setShowGlobalSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowGlobalSuggestions(false), 200)}
                onChange={(e) => {
                  setGlobalQuery(e.target.value);
                  setShowGlobalSuggestions(e.target.value.trim().length >= 1);
                  setGlobalHighlightedIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (!showGlobalSuggestions || globalSuggestions.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setGlobalHighlightedIndex((i) => (i + 1) % globalSuggestions.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setGlobalHighlightedIndex((i) => (i - 1 + globalSuggestions.length) % globalSuggestions.length);
                  } else if (e.key === 'Enter' && globalHighlightedIndex >= 0 && globalSuggestions[globalHighlightedIndex]) {
                    e.preventDefault();
                    const chosen = globalSuggestions[globalHighlightedIndex];
                    setShowGlobalSuggestions(false);
                    navigate(`/students?q=${encodeURIComponent(chosen.admissionNumber)}`);
                  } else if (e.key === 'Escape') {
                    setShowGlobalSuggestions(false);
                  }
                }}
                placeholder={
                  lang === 'hi'
                    ? 'नाम, प्रवेश सं., पिता का नाम या मोबाइल से खोजें...'
                    : 'Search by Name, Adm No, Father Name, or Phone...'
                }
                className="w-full pl-9 pr-3 py-1.5 text-xs lg:text-sm border border-slate-300 rounded focus:outline-none focus:border-svss-navy"
              />
              {showGlobalSuggestions && globalSuggestions.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Global Student Search Suggestions"
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs"
                >
                  {globalSuggestions.map((st: any, idx: number) => {
                    const cls = st.currentEnrollment?.className || '';
                    const sec = st.currentEnrollment?.sectionName || '';
                    return (
                      <button
                        key={st.id}
                        type="button"
                        role="option"
                        aria-selected={idx === globalHighlightedIndex}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          setShowGlobalSuggestions(false);
                          navigate(`/students?q=${encodeURIComponent(st.admissionNumber)}`);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 ${
                          idx === globalHighlightedIndex ? 'bg-blue-50 border-l-4 border-l-svss-navy' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {st.fullName} <span className="font-mono text-[11px] text-svss-navy font-semibold">({st.admissionNumber})</span>
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            {lang === 'hi' ? 'पिता:' : 'Father:'} {st.guardianName}
                            {st.primaryContactNumber ? ` | 📞 ${st.primaryContactNumber}` : ''}
                          </div>
                        </div>
                        {cls && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] shrink-0">
                            {cls}{sec ? `-${sec}` : ''}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-svss-navy text-white text-xs font-semibold rounded hover:bg-blue-900"
            >
              {t('search')}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Persistent Hindi / English Language Switcher */}
            <button
              type="button"
              onClick={toggleLang}
              aria-label="Switch Language / भाषा बदलें"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-svss-navy text-xs font-bold hover:bg-blue-100"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'भाषा: हिंदी' : 'Language: English'}</span>
            </button>

            {/* Session Selector for Admin; Read-Only Active Session Label for Fee Collector */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <label htmlFor="global-session-select" className="text-xs font-semibold text-slate-600">
                  {lang === 'hi' ? 'सत्र:' : 'Session:'}
                </label>
                <select
                  id="global-session-select"
                  value={selectedAcademicYearId}
                  onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                  className="text-xs lg:text-sm border border-slate-300 rounded px-2.5 py-1 bg-white font-medium text-slate-800"
                >
                  {academicYears.length > 0 ? (
                    academicYears.map((yr) => (
                      <option key={yr.id} value={yr.id}>
                        {yr.code} {yr.isCurrent ? (lang === 'hi' ? '(वर्तमान)' : '(Current)') : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">{t('loading')}</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'सत्र:' : 'Session:'} {selectedAcademicYear?.code || '2026-27'}
              </div>
            )}

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">{user?.fullName || (lang === 'hi' ? 'कार्यालय कर्मचारी' : 'Office Staff')}</div>
                <div className="text-[11px] text-svss-saffron font-semibold">
                  {formatRoleLabel(user?.roles?.[0] || '', lang)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-bold"
                title={lang === 'hi' ? 'लॉग आउट करें' : 'Sign Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'लॉग आउट' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Header & Breadcrumbs */}
        <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-2 no-print">
          <div>
            <div className="text-xs text-slate-500">
              {lang === 'hi' ? 'स्वामी विवेकानंद शिक्षण संस्थान' : 'Swami Vivekanand Sikshan Sansthan'} {breadcrumbs.map((b) => ` / ${b}`).join('')}
            </div>
            <h2 className="text-base lg:text-lg font-bold text-slate-900 mt-0.5">{title}</h2>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        <main className="flex-1 p-4 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
};
