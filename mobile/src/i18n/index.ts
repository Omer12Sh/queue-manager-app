import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from './locales/en.json';
import he from './locales/he.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' as const },
  { code: 'he', label: 'עברית', flag: '🇮🇱', dir: 'rtl' as const },
];

// Allow RTL layout globally. We call forceRTL(true) here because:
// 1. The default language is Hebrew (RTL) so first-install / new sessions start in RTL.
// 2. On Android this must be called synchronously before the first React render to avoid
//    a layout flash. The LanguageContext useEffect always runs AFTER this and overrides
//    with the persisted language choice, so English users end up with forceRTL(false)
//    as the last call — which takes effect on the next app open.
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
