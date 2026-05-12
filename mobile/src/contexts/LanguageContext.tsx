import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { SUPPORTED_LANGUAGES } from '../i18n';

const DEFAULT_LANGUAGE = 'he';

interface LanguageContextType {
  language: string;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  useEffect(() => {
    AsyncStorage.getItem('qm_language').then((stored) => {
      const lang = stored || DEFAULT_LANGUAGE;
      setLanguageState(lang);
      i18n.changeLanguage(lang);
    });
  }, []);

  const dir = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.dir ?? 'ltr';

  const setLanguage = async (lang: string) => {
    await AsyncStorage.setItem('qm_language', lang);
    i18n.changeLanguage(lang);
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, dir, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
