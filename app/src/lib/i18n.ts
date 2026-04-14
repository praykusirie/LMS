import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import sw from '@/locales/sw.json';
import hi from '@/locales/hi.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';

const LANG_STORAGE_KEY = 'lms-language';

function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && ['en', 'sw', 'hi', 'es', 'fr'].includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sw: { translation: sw },
    hi: { translation: hi },
    es: { translation: es },
    fr: { translation: fr },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch { /* ignore */ }
}

export default i18n;
