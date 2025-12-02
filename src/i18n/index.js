// i18n Configuration for DOTO Mobile App
// Supports English (LTR) and Hebrew (RTL)

import en from './translations/en.json';
import he from './translations/he.json';

const translations = { en, he };

// Current language state
let currentLanguage = 'en';
let listeners = [];

/**
 * Set the current language
 * @param {string} lang - Language code ('en' or 'he')
 */
export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    // Notify all listeners
    listeners.forEach(listener => listener(lang));
  }
};

/**
 * Get the current language
 * @returns {string} Current language code
 */
export const getLanguage = () => currentLanguage;

/**
 * Check if current language is RTL
 * @returns {boolean} True if RTL
 */
export const isRTL = () => currentLanguage === 'he';

/**
 * Subscribe to language changes
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToLanguageChange = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-separated path
 * @returns {*} Value at path or undefined
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Translate a key with optional interpolation
 * @param {string} key - Translation key (dot notation)
 * @param {Object} params - Interpolation parameters
 * @returns {string} Translated string
 */
export const t = (key, params = {}) => {
  const translation = getNestedValue(translations[currentLanguage], key);
  
  if (translation === undefined) {
    // Fallback to English
    const fallback = getNestedValue(translations.en, key);
    if (fallback === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return interpolate(fallback, params);
  }
  
  return interpolate(translation, params);
};

/**
 * Interpolate parameters into a string
 * @param {string} str - String with {{param}} placeholders
 * @param {Object} params - Parameters to interpolate
 * @returns {string} Interpolated string
 */
const interpolate = (str, params) => {
  if (typeof str !== 'string') return str;
  
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
};

/**
 * Get plural form based on count
 * Hebrew plural rules: 1 = singular, 2 = dual (for some words), other = plural
 * @param {string} key - Base translation key
 * @param {number} count - Count for pluralization
 * @param {Object} params - Additional parameters
 * @returns {string} Pluralized translation
 */
export const plural = (key, count, params = {}) => {
  const lang = currentLanguage;
  let suffix;
  
  if (lang === 'he') {
    // Hebrew plural rules
    if (count === 1) suffix = '_one';
    else if (count === 2) suffix = '_two';
    else suffix = '_other';
  } else {
    // English plural rules
    suffix = count === 1 ? '_one' : '_other';
  }
  
  // Try specific plural form first
  let translation = getNestedValue(translations[lang], key + suffix);
  
  // Fallback to base key
  if (translation === undefined) {
    translation = getNestedValue(translations[lang], key);
  }
  
  // Fallback to English
  if (translation === undefined) {
    translation = getNestedValue(translations.en, key + suffix) ||
                  getNestedValue(translations.en, key) ||
                  key;
  }
  
  return interpolate(translation, { ...params, count });
};

export default {
  t,
  plural,
  setLanguage,
  getLanguage,
  isRTL,
  subscribeToLanguageChange,
};

