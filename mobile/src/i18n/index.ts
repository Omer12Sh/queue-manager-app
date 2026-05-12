import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from './locales/en.json';
import he from './locales/he.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' as const },
  { code: 'he', label: 'עברית', flag: '🇮🇱', dir: 'rtl' as const },
];

// Allow RTL layout globally. forceRTL is set here because the default
// language is Hebrew (RTL); when the user switches to LTR the app will
// prompt for a restart so the native layout engine can re-apply.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'he',
    supportedLngs: ['en', 'he'],
    lng: 'he',
    interpolation: { escapeValue: false },
    // Required on React Native because Intl.PluralRules is not consistently available.
    compatibilityJSON: 'v3',
  });

export default i18n;
