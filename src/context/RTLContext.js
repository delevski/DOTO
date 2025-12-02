// RTL Context Provider for Hebrew/English language support
// Following RTL Support Specification from docs/rtl-support-spec.md

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t, setLanguage as setI18nLanguage, isRTL as checkIsRTL, subscribeToLanguageChange } from '../i18n';

const LANGUAGE_KEY = '@doto_language';

// Create context
const RTLContext = createContext({
  isRTL: false,
  language: 'en',
  t: (key) => key,
  setLanguage: () => {},
  toggleLanguage: () => {},
});

/**
 * RTL Provider Component
 * Wraps the app and provides RTL/i18n context to all children
 */
export function RTLProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [isRTL, setIsRTL] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize language from storage
  useEffect(() => {
    const initLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'he')) {
          setLanguageState(storedLanguage);
          setI18nLanguage(storedLanguage);
          setIsRTL(storedLanguage === 'he');
          
          // Apply RTL to I18nManager
          const shouldBeRTL = storedLanguage === 'he';
          if (I18nManager.isRTL !== shouldBeRTL) {
            I18nManager.allowRTL(shouldBeRTL);
            I18nManager.forceRTL(shouldBeRTL);
          }
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      } finally {
        setIsReady(true);
      }
    };

    initLanguage();
  }, []);

  // Subscribe to i18n language changes
  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange((newLang) => {
      setLanguageState(newLang);
      setIsRTL(newLang === 'he');
    });
    return unsubscribe;
  }, []);

  /**
   * Set the language and persist to storage
   * @param {string} lang - 'en' or 'he'
   */
  const setLanguage = useCallback(async (lang) => {
    if (lang !== 'en' && lang !== 'he') return;

    try {
      // Update state
      setLanguageState(lang);
      setI18nLanguage(lang);
      setIsRTL(lang === 'he');

      // Persist to storage
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);

      // Apply RTL to I18nManager
      const shouldBeRTL = lang === 'he';
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        // Note: Full RTL switch may require app restart on some devices
      }
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, []);

  /**
   * Toggle between English and Hebrew
   */
  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'he' : 'en');
  }, [language, setLanguage]);

  // Context value
  const value = {
    isRTL,
    language,
    t,
    setLanguage,
    toggleLanguage,
  };

  // Don't render children until language is loaded
  if (!isReady) {
    return null;
  }

  return (
    <RTLContext.Provider value={value}>
      {children}
    </RTLContext.Provider>
  );
}

/**
 * Hook to access RTL context
 * @returns {Object} RTL context value
 */
export function useRTL() {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within an RTLProvider');
  }
  return context;
}

/**
 * Hook to get RTL-aware style helpers
 * @returns {Object} Style helper functions
 */
export function useRTLStyles() {
  const { isRTL } = useRTL();

  return {
    // Flex direction for rows
    row: isRTL ? 'row-reverse' : 'row',
    
    // Text alignment
    textAlign: isRTL ? 'right' : 'left',
    textAlignOpposite: isRTL ? 'left' : 'right',
    
    // Margins and paddings (inline-start/end simulation)
    marginStart: isRTL ? 'marginRight' : 'marginLeft',
    marginEnd: isRTL ? 'marginLeft' : 'marginRight',
    paddingStart: isRTL ? 'paddingRight' : 'paddingLeft',
    paddingEnd: isRTL ? 'paddingLeft' : 'paddingRight',
    
    // Positioning
    start: isRTL ? 'right' : 'left',
    end: isRTL ? 'left' : 'right',
    
    // Transform for directional icons
    flipIcon: isRTL ? { transform: [{ scaleX: -1 }] } : {},
    
    // Helper to create RTL-aware style object
    rtlStyle: (ltrStyle, rtlStyle) => isRTL ? rtlStyle : ltrStyle,
    
    // Check if RTL
    isRTL,
  };
}

export default RTLContext;

