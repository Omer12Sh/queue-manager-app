import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import he from './locales/he.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' as const },
  { code: 'he', label: 'עברית', flag: '🇮🇱', dir: 'rtl' as const },
];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'he'],
    lng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
  });

export default i18n;
