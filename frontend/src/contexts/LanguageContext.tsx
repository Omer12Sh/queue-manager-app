import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import i18n, { SUPPORTED_LANGUAGES } from '../i18n';

interface LanguageContextType {
  language: string;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<string>(
    () => localStorage.getItem('qm_language') || i18n.language || 'en',
  );

  const dir = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.dir ?? 'ltr';

  const setLanguage = (lang: string) => {
    localStorage.setItem('qm_language', lang);
    i18n.changeLanguage(lang);
    setLanguageState(lang);
  };

  // Keep DOM dir attribute in sync
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  // Sync if i18n changes externally (e.g. browser detection on first load)
  useEffect(() => {
    const handler = (lng: string) => setLanguageState(lng);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, dir, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
