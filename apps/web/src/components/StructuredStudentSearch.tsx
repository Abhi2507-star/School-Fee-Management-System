import React from 'react';
import {
  StructuredStudentSearchCriteria,
  EMPTY_STRUCTURED_SEARCH_CRITERIA,
  StudentSummaryItem,
  getStudentAutocompleteSuggestions,
  buildAutoFillCriteriaFromStudent,
} from '../utils/workflows';
import { useLanguage } from '../hooks/useLanguage';

export interface ClassOptionItem {
  id: string;
  name: string;
  sections?: Array<{ id: string; name: string }>;
}

export interface StructuredStudentSearchProps {
  mode: 'pos' | 'directory';
  criteria: StructuredStudentSearchCriteria;
  onCriteriaChange: (patch: Partial<StructuredStudentSearchCriteria>) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  classes: ClassOptionItem[];
  isSearching?: boolean;
  hasSearched?: boolean;
  searchError?: string;
  results?: any[];
  selectedStudentId?: string | null;
  onSelectStudent?: (student: any) => void;
  isLoadingStudent?: boolean;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  suggestionsPool?: StudentSummaryItem[];
  onAutoFillSelect?: (student: StudentSummaryItem, filled: StructuredStudentSearchCriteria) => void;
}

const DEFAULT_CLASS_NAMES = [
  'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4',
  'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9',
  'Class 10', 'Class 11', 'Class 12',
];

const DEFAULT_SECTION_NAMES = ['A', 'B', 'C'];

export const StructuredStudentSearch: React.FC<StructuredStudentSearchProps> = ({
  mode,
  criteria,
  onCriteriaChange,
  onSearchSubmit,
  onReset,
  classes,
  isSearching = false,
  hasSearched = false,
  searchError = '',
  results = [],
  selectedStudentId = null,
  onSelectStudent,
  isLoadingStudent = false,
  statusFilter,
  onStatusFilterChange,
  suggestionsPool = [],
  onAutoFillSelect,
}) => {
  const { lang, t } = useLanguage();
  const [activeDropdown, setActiveDropdown] = React.useState<'studentName' | 'fatherName' | null>(null);
  const [highlightIndex, setHighlightIndex] = React.useState<number>(-1);

  // Only compute suggestions when the user has typed at least 1 character (never on bare focus)
  const studentSuggestions = React.useMemo(() => {
    if (!criteria.studentName.trim()) return [];
    return getStudentAutocompleteSuggestions(suggestionsPool, 'studentName', criteria.studentName, criteria);
  }, [suggestionsPool, criteria]);

  const fatherSuggestions = React.useMemo(() => {
    if (!criteria.fatherName.trim()) return [];
    return getStudentAutocompleteSuggestions(suggestionsPool, 'fatherName', criteria.fatherName, criteria);
  }, [suggestionsPool, criteria]);

  const handleChooseSuggestion = (st: StudentSummaryItem) => {
    const filled = buildAutoFillCriteriaFromStudent(st);
    onCriteriaChange(filled);
    setActiveDropdown(null);
    setHighlightIndex(-1);
    if (onAutoFillSelect) {
      onAutoFillSelect(st, filled);
    }
  };

  const hasDbClasses = classes && classes.length > 0;
  const selectedClassObj = hasDbClasses
    ? classes.find((c) => c.id === criteria.classValue || c.name === criteria.classValue)
    : undefined;

  const sectionOptions: Array<{ value: string; label: string }> = React.useMemo(() => {
    if (selectedClassObj && selectedClassObj.sections && selectedClassObj.sections.length > 0) {
      return selectedClassObj.sections.map((s) => ({
        value: s.id,
        label: `${t('sectionLabel')} ${s.name}`,
      }));
    }
    return DEFAULT_SECTION_NAMES.map((sec) => ({
      value: sec,
      label: `${t('sectionLabel')} ${sec}`,
    }));
  }, [selectedClassObj, t]);

  return (
    <div className="bg-white rounded border border-slate-200 shadow-sm overflow-visible">
      <div className="bg-slate-50 rounded-t px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-svss-navy">
          {t('findStudent')}
        </h3>
        <span className="text-[11px] text-slate-500">
          {lang === 'hi'
            ? 'किसी एक या अधिक जानकारी से खोजें'
            : 'Search by any single field or combination'}
        </span>
      </div>

      <form onSubmit={onSearchSubmit} className="p-3.5 space-y-3" autoComplete="off">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <label
              htmlFor={`${mode}-search-student-name`}
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              {t('studentName')} / {t('admissionNumber')}
            </label>
            <input
              id={`${mode}-search-student-name`}
              type="text"
              autoComplete="off"
              value={criteria.studentName}
              onBlur={() => setTimeout(() => setActiveDropdown(null), 160)}
              onChange={(e) => {
                const val = e.target.value;
                onCriteriaChange({ studentName: val });
                setActiveDropdown(val.trim().length > 0 ? 'studentName' : null);
                setHighlightIndex(0);
              }}
              onKeyDown={(e) => {
                if (activeDropdown !== 'studentName' || studentSuggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightIndex((i) => (i + 1) % studentSuggestions.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightIndex((i) => (i - 1 + studentSuggestions.length) % studentSuggestions.length);
                } else if (e.key === 'Enter' && highlightIndex >= 0 && studentSuggestions[highlightIndex]) {
                  e.preventDefault();
                  handleChooseSuggestion(studentSuggestions[highlightIndex]);
                } else if (e.key === 'Escape') {
                  setActiveDropdown(null);
                }
              }}
              placeholder={lang === 'hi' ? 'नाम या प्रवेश संख्या (जैसे SVSS/2026/001)' : 'Name or Admission No'}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-svss-navy"
            />
            {activeDropdown === 'studentName' && studentSuggestions.length > 0 && (
              <div
                role="listbox"
                aria-label="Student Name Suggestions"
                className="absolute left-0 right-0 sm:w-80 top-full mt-1 bg-white border border-slate-300 rounded shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100"
              >
                {studentSuggestions.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    role="option"
                    aria-selected={idx === highlightIndex}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      handleChooseSuggestion(st);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 ${
                      idx === highlightIndex ? 'bg-blue-50 border-l-4 border-l-svss-navy' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {st.fullName} <span className="font-mono text-[10px] text-svss-navy">({st.admissionNumber})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {t('fatherName')}: {st.guardianName}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] shrink-0">
                      {st.className}-{st.section}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label
              htmlFor={`${mode}-search-father-name`}
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              {t('fatherName')}
            </label>
            <input
              id={`${mode}-search-father-name`}
              type="text"
              autoComplete="off"
              value={criteria.fatherName}
              onBlur={() => setTimeout(() => setActiveDropdown(null), 160)}
              onChange={(e) => {
                const val = e.target.value;
                onCriteriaChange({ fatherName: val });
                setActiveDropdown(val.trim().length > 0 ? 'fatherName' : null);
                setHighlightIndex(0);
              }}
              onKeyDown={(e) => {
                if (activeDropdown !== 'fatherName' || fatherSuggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightIndex((i) => (i + 1) % fatherSuggestions.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightIndex((i) => (i - 1 + fatherSuggestions.length) % fatherSuggestions.length);
                } else if (e.key === 'Enter' && highlightIndex >= 0 && fatherSuggestions[highlightIndex]) {
                  e.preventDefault();
                  handleChooseSuggestion(fatherSuggestions[highlightIndex]);
                } else if (e.key === 'Escape') {
                  setActiveDropdown(null);
                }
              }}
              placeholder={lang === 'hi' ? 'पिता का नाम लिखें' : "Father's Name"}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-svss-navy"
            />
            {activeDropdown === 'fatherName' && fatherSuggestions.length > 0 && (
              <div
                role="listbox"
                aria-label="Father Name Suggestions"
                className="absolute left-0 right-0 sm:w-80 top-full mt-1 bg-white border border-slate-300 rounded shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100"
              >
                {fatherSuggestions.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    role="option"
                    aria-selected={idx === highlightIndex}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      handleChooseSuggestion(st);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 ${
                      idx === highlightIndex ? 'bg-blue-50 border-l-4 border-l-svss-navy' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{st.guardianName}</div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {st.fullName} ({st.admissionNumber})
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] shrink-0">
                      {st.className}-{st.section}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor={`${mode}-search-class`}
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              {t('classLabel')}
            </label>
            <select
              id={`${mode}-search-class`}
              value={criteria.classValue}
              onChange={(e) =>
                onCriteriaChange({
                  classValue: e.target.value,
                  sectionValue: '',
                })
              }
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-medium focus:outline-none focus:border-svss-navy"
            >
              <option value="">{lang === 'hi' ? 'सभी कक्षाएँ (LKG – 12)' : 'All Classes (LKG – 12)'}</option>
              {hasDbClasses
                ? classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                : DEFAULT_CLASS_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${mode}-search-section`}
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              {t('sectionLabel')}
            </label>
            <select
              id={`${mode}-search-section`}
              value={criteria.sectionValue}
              onChange={(e) => onCriteriaChange({ sectionValue: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-medium focus:outline-none focus:border-svss-navy"
            >
              <option value="">{lang === 'hi' ? 'सभी सेक्शन' : 'All Sections'}</option>
              {sectionOptions.map((sec) => (
                <option key={sec.value} value={sec.value}>
                  {sec.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {mode === 'directory' && onStatusFilterChange ? (
            <div className="flex items-center gap-2">
              <label htmlFor="dir-status-filter" className="text-xs font-semibold text-slate-600">
                {lang === 'hi' ? 'स्थिति:' : 'Status:'}
              </label>
              <select
                id="dir-status-filter"
                value={statusFilter || ''}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white font-medium"
              >
                <option value="">{lang === 'hi' ? 'सभी' : 'All'}</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PROMOTED">PROMOTED</option>
                <option value="TRANSFERRED">TRANSFERRED</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
              </select>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                onCriteriaChange(EMPTY_STRUCTURED_SEARCH_CRITERIA);
                onReset();
              }}
              className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700"
            >
              {t('reset')}
            </button>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-svss-navy hover:bg-blue-900 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm"
            >
              {isSearching ? t('loading') : t('search')}
            </button>
          </div>
        </div>
      </form>

      {searchError && (
        <div
          role="alert"
          className="mx-3.5 mb-3 p-2.5 bg-red-50 border border-red-300 text-red-800 text-xs rounded font-medium"
        >
          {searchError}
        </div>
      )}

      {mode === 'pos' && hasSearched && !isSearching && results.length === 0 && !searchError && (
        <div className="mx-3.5 mb-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded font-medium">
          {t('noResults')}
        </div>
      )}

      {mode === 'pos' && hasSearched && results.length > 0 && (
        <div className="border-t border-slate-200">
          <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-800">
              {lang === 'hi'
                ? `मिले हुए विद्यार्थी (${results.length})`
                : `Matching Students (${results.length})`}
            </span>
            <span className="text-[11px] text-slate-600">
              {lang === 'hi'
                ? 'प्रवेश संख्या और पिता का नाम मिलाकर विद्यार्थी चुनें'
                : "Verify Admission No & Father's Name to select"}
            </span>
          </div>

          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-2 px-3 text-left font-bold whitespace-nowrap">{t('admissionNumber')}</th>
                  <th className="py-2 px-3 text-left font-bold whitespace-nowrap">{t('studentName')}</th>
                  <th className="py-2 px-3 text-left font-bold whitespace-nowrap">{t('fatherName')}</th>
                  <th className="py-2 px-3 text-left font-bold whitespace-nowrap">{t('classLabel')}</th>
                  <th className="py-2 px-3 text-center font-bold whitespace-nowrap">{t('sectionLabel')}</th>
                  <th className="py-2 px-3 text-right font-bold whitespace-nowrap">
                    {lang === 'hi' ? 'चयन करें' : 'Select'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((st) => {
                  const enr = st.enrollments?.[0];
                  const clsLabel = enr?.schoolClass?.name || st.className || 'N/A';
                  const secLabel = enr?.section?.name || st.section || 'N/A';
                  const isSelected = selectedStudentId === st.id;
                  return (
                    <tr
                      key={st.id}
                      className={`border-b border-slate-100 transition-colors ${
                        isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-svss-navy whitespace-nowrap">
                        {st.admissionNumber}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {st.fullName}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {st.guardianName}
                      </td>
                      <td className="py-2 px-3 text-slate-800 whitespace-nowrap">{clsLabel}</td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                        {secLabel}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isLoadingStudent}
                          onClick={() => onSelectStudent && onSelectStudent(st)}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            isSelected
                              ? 'bg-emerald-700 text-white'
                              : 'bg-svss-navy hover:bg-blue-900 text-white'
                          }`}
                        >
                          {isSelected
                            ? lang === 'hi'
                              ? 'चयनित ✓'
                              : 'Selected ✓'
                            : lang === 'hi'
                            ? 'चुनें'
                            : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
