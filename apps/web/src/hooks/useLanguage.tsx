import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_APP_LANGUAGE, HINDI_FIRST_LABELS, getLocalizedLabel } from '../utils/workflows';

export type AppLanguage = 'hi' | 'en';

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (next: AppLanguage) => void;
  toggleLang: () => void;
  t: (key: keyof typeof HINDI_FIRST_LABELS['hi']) => string;
}

const STORAGE_KEY = 'svss_preferred_language';

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_APP_LANGUAGE,
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => getLocalizedLabel(DEFAULT_APP_LANGUAGE, key),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_APP_LANGUAGE;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore storage errors
    }
  }, [lang]);

  const setLang = (next: AppLanguage) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'hi' ? 'en' : 'hi'));
  const t = (key: keyof typeof HINDI_FIRST_LABELS['hi']) => getLocalizedLabel(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
