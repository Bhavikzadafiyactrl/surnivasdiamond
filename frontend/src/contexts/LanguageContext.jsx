import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Get language from localStorage or default to 'en'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  // Update localStorage and HTML lang attribute when language changes
  useEffect(() => {
    localStorage.setItem('language', language);
    // Update HTML lang attribute for Vietnamese font optimization
    const langCode = language === 'vn' ? 'vi' : 'en';
    document.documentElement.setAttribute('lang', langCode);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'vn' : 'en'));
  };

  // Helper function to get nested translation value
  // Usage: t('nav.home')
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Fallback to English if key missing in current lang
        let fallback = translations['en'];
        for (const fk of keys) {
          if (fallback && fallback[fk]) {
            fallback = fallback[fk];
          } else {
            return key; // Return key if not found
          }
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
