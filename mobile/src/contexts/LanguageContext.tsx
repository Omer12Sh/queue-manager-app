import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Alert, I18nManager } from 'react-native';
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
      // Sync RTL state with stored language on startup. On iOS, changes only take
      // effect after app restart. On Android the last call to forceRTL wins across
      // all calls in the same bundle session — this call always runs after the
      // synchronous i18n/index.ts forceRTL(true), so it correctly overrides it.
      const isRtl = SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.dir === 'rtl';
      if (I18nManager.isRTL !== isRtl) {
        I18nManager.forceRTL(isRtl);
      }
    });
  }, []);

  const dir = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.dir ?? 'ltr';

  const setLanguage = async (lang: string) => {
    await AsyncStorage.setItem('qm_language', lang);
    i18n.changeLanguage(lang);
    const newIsRtl = SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.dir === 'rtl';
    if (I18nManager.isRTL !== newIsRtl) {
      I18nManager.forceRTL(newIsRtl);
      Alert.alert(
        lang === 'he' ? 'שנה כיוון' : 'Direction Change',
        lang === 'he'
          ? 'נא להפעיל מחדש את האפליקציה כדי להחיל את כיוון הטקסט.'
          : 'Please restart the app to apply the new text direction.',
      );
    }
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
