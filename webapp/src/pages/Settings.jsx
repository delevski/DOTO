import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Shield, Lock, Globe, Moon, Sun, Trash2, ChevronRight, Check } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/useStore';
import { useTranslation } from '../utils/translations';
import { Link } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, language, setLanguage } = useSettingsStore();
  const { logout } = useAuthStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    // Initialize settings on mount
    const settingsStore = useSettingsStore.getState();
    settingsStore.initSettings();
  }, []);

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'he', name: 'Hebrew', native: 'עברית' },
  ];

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className={`max-w-4xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="dark:text-gray-300" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings')}</h1>
      </div>

      <div className="space-y-6">
        {/* Account Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('account')}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <Link 
              to="/edit-profile"
              className={`w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Shield size={20} className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t('editProfile')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('editProfileDesc')}</div>
                </div>
              </div>
              <ChevronRight size={20} className={`text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
            <button className={`w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Lock size={20} className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t('privacySecurity')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('privacySecurityDesc')}</div>
                </div>
              </div>
              <ChevronRight size={20} className={`text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
            <button className={`w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t('notifications')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('notificationsDesc')}</div>
                </div>
              </div>
              <ChevronRight size={20} className={`text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* App Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('appPreferences')}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* Language Selector */}
            <button 
              onClick={() => setShowLanguageModal(true)}
              className={`w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Globe size={20} className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t('language')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {languages.find(l => l.code === language)?.native || t('languageDesc')}
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className={`text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className={`w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {darkMode ? (
                    <Sun size={20} className="text-yellow-500" />
                  ) : (
                    <Moon size={20} className="text-gray-600 dark:text-gray-300" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t('darkMode')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('darkModeDesc')}</div>
                </div>
              </div>
              <div className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                {isRTL ? (
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-1' : 'right-1'}`}></div>
                ) : (
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'right-1' : 'left-1'}`}></div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
          <div className="p-6 border-b border-red-100 dark:border-red-900/30">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">{t('dangerZone')}</h2>
          </div>
          <div className="p-6">
            <button 
              onClick={handleDeleteAccount}
              className={`w-full text-left px-6 py-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="font-semibold text-red-600 dark:text-red-400">{t('deleteAccount')}</div>
                  <div className="text-sm text-red-400 dark:text-red-500">{t('deleteAccountDesc')}</div>
                </div>
              </div>
              <ChevronRight size={20} className={`text-red-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLanguageModal(false)}>
          <div 
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 ${isRTL ? 'rtl' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('language')}</h3>
            <div className="space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between ${
                    language === lang.code
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{lang.native}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{lang.name}</div>
                  </div>
                  {language === lang.code && <Check size={20} />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLanguageModal(false)}
              className="w-full mt-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
