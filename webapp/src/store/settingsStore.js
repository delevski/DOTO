import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      darkMode: false,
      language: 'en',
      toggleDarkMode: () => {
        const currentState = get();
        const newDarkMode = !currentState.darkMode;
        // Apply dark mode to document immediately
        if (typeof document !== 'undefined') {
          const html = document.documentElement;
          if (newDarkMode) {
            html.classList.add('dark');
            console.log('Dark mode enabled - class added:', html.classList.contains('dark'));
          } else {
            html.classList.remove('dark');
            console.log('Dark mode disabled - class removed');
          }
        }
        set({ darkMode: newDarkMode });
      },
      setLanguage: (lang) => {
        set({ language: lang });
        // Update HTML dir attribute for RTL languages
        if (typeof document !== 'undefined') {
          if (lang === 'he') {
            document.documentElement.setAttribute('dir', 'rtl');
          } else {
            document.documentElement.setAttribute('dir', 'ltr');
          }
        }
      },
      // Initialize settings on load
      initSettings: () => {
        // Use getState to access current state after hydration
        if (typeof document !== 'undefined') {
          const state = get();
          if (state.darkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          if (state.language === 'he') {
            document.documentElement.setAttribute('dir', 'rtl');
          } else {
            document.documentElement.setAttribute('dir', 'ltr');
          }
        }
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Apply settings immediately after rehydration
        if (state && typeof document !== 'undefined') {
          if (state.darkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          if (state.language === 'he') {
            document.documentElement.setAttribute('dir', 'rtl');
          } else {
            document.documentElement.setAttribute('dir', 'ltr');
          }
        }
      },
    }
  )
);
