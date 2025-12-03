import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { setLanguage as setI18nLanguage } from '../i18n';
import { saveUserLanguage } from '../utils/notifications';

const SETTINGS_KEY = '@doto_settings';

export const useSettingsStore = create((set, get) => ({
  darkMode: false,
  language: 'en',
  isLoading: true,

  // Initialize settings from storage
  initSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        const lang = settings.language || 'en';
        
        set({ 
          darkMode: settings.darkMode || false,
          language: lang,
          isLoading: false 
        });
        
        // Sync with i18n module
        setI18nLanguage(lang);
        
        // Apply RTL if Hebrew
        if (lang === 'he') {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  // Toggle dark mode
  toggleDarkMode: async () => {
    const newValue = !get().darkMode;
    set({ darkMode: newValue });
    await get().saveSettings();
  },

  // Set dark mode directly
  setDarkMode: async (value) => {
    set({ darkMode: value });
    await get().saveSettings();
  },

  // Set language
  setLanguage: async (lang, userId = null) => {
    set({ language: lang });
    
    // Sync with i18n module
    setI18nLanguage(lang);
    
    // Handle RTL for Hebrew
    const isRTL = lang === 'he';
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    
    // Save to InstantDB if user is logged in
    if (userId) {
      saveUserLanguage(userId, lang);
    }
    
    await get().saveSettings();
  },

  // Save settings to storage
  saveSettings: async () => {
    try {
      const { darkMode, language } = get();
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ darkMode, language }));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));

