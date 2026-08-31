import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import as from '../locales/as.json';

const locales: any = { en, hi, as };

let currentLang = 'en';

const systemLocales = Localization.getLocales();
if (systemLocales && systemLocales.length > 0) {
    const code = systemLocales[0].languageCode;
    if (code && locales[code]) {
      currentLang = code;
    }
}

const listeners = new Set<Function>();

AsyncStorage.getItem('resq_lang').then(lang => {
  if (lang && locales[lang]) {
    currentLang = lang;
    listeners.forEach(fn => fn(currentLang));
  }
}).catch(console.error);

export const setLanguage = async (lang: string) => {
  if (locales[lang]) {
    currentLang = lang;
    await AsyncStorage.setItem('resq_lang', lang);
    listeners.forEach(fn => fn(currentLang));
  }
};

export const getLanguage = () => currentLang;

export const useTranslation = () => {
  const [lang, setLangState] = useState(currentLang);

  useEffect(() => {
    listeners.add(setLangState);
    return () => { listeners.delete(setLangState); };
  }, []);

  const t = (key: string) => {
    return locales[lang]?.[key] || locales['en']?.[key] || FALLBACK_EN[key] || key.toUpperCase().replace(/_/g, ' ');
  };

  return { t, lang, setLanguage };
};
