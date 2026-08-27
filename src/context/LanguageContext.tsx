import React, { createContext, useContext, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import type { Language } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'th',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('deung_sati_lang') as Language;
      if (saved && ['th', 'en', 'zh', 'ja'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn(e);
    }
    return 'th';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('deung_sati_lang', newLang);
    } catch (e) {
      console.warn(e);
    }
  };

  const t = (key: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.th;
    return dict[key] || TRANSLATIONS.th[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
