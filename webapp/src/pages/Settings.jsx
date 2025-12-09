import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Shield, Lock, Globe, Moon, Sun, Trash2, ChevronRight, Check } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/useStore';
import { useTranslation } from '../utils/translations';
import { Link } from 'react-router-dom';
import { db } from '../lib/instant';
import { sendPushNotificationToUser } from '../utils/pushNotifications';

export default function Settings() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, language, setLanguage } = useSettingsStore();
  const { logout, user } = useAuthStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

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
    setLanguage(langCode, user?.id);
    setShowLanguageModal(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    if (window.confirm(t('areYouSureDeleteAccount'))) {
      logout();
      navigate('/login');
    }
  };

  const testPushNotification = async () => {
    if (!user?.id) {
      alert('Not logged in');
      return;
    }

    setDebugInfo('Testing...\n');

    try {
      // 1. Check if user exists in DB (use queryOnce for one-time queries)
      console.log('🔔 [Settings] Querying users from DB...');
      let data;
      try {
        const result = await db.queryOnce({ users: {} });
        data = result?.data || result;
        console.log('🔔 [Settings] Query successful, users count:', data?.users?.length || 0);
      } catch (queryError) {
        console.error('🔔 [Settings] Query error:', queryError);
        setDebugInfo(`Database query error: ${queryError.message}\n\nCheck browser console (F12) for details.`);
        alert(`Database error: ${queryError.message}\n\nCheck browser console (F12) for details.`);
        return;
      }
      const dbUser = data?.users?.find(u => u.id === user.id);
      
      let info = `User ID: ${user.id}\n`;
      info += `Total users in DB: ${data?.users?.length || 0}\n`;
      info += `User found in DB: ${dbUser ? 'YES' : 'NO'}\n`;
      
      if (dbUser) {
        info += `Push Token: ${dbUser.pushToken ? dbUser.pushToken.substring(0, 50) + '...' : 'NOT FOUND'}\n`;
        info += `FCM Token: ${dbUser.fcmToken ? dbUser.fcmToken.substring(0, 50) + '...' : 'NOT FOUND'}\n`;
        info += `Language: ${dbUser.language || 'not set'}\n\n`;
      } else {
        info += `Available user IDs: ${data?.users?.map(u => u.id).slice(0, 5).join(', ')}\n\n`;
      }

      // Check for either token
      const hasToken = dbUser && (dbUser.pushToken || dbUser.fcmToken);
      
      if (!hasToken) {
        info += '❌ NO PUSH TOKEN - Mobile app needs to save token first!\n';
        info += 'Go to mobile app Settings and tap "🧪 Test Notifications"\n';
        setDebugInfo(info);
        alert('No push token found! Open mobile app Settings and tap "🧪 Test Notifications" to save token.');
        return;
      }

      // 2. Try sending a test notification
      info += 'Sending test notification...\n';
      setDebugInfo(info);
      console.log('🔔 [Settings] Calling sendPushNotificationToUser...');

      const result = await sendPushNotificationToUser(
        user.id,
        'newMessage',
        { userName: 'Test from Web' },
        { type: 'test' }
      );

      info += `Result: ${result ? '✅ SUCCESS' : '⚠️ FAILED (but notification saved in DB)'}\n`;
      info += `\nNote: Browser push may fail due to CORS.\n`;
      info += `Notifications are saved in database and will appear in mobile app.\n`;
      info += `Check browser console (F12) for detailed logs\n`;
      setDebugInfo(info);

      if (result) {
        alert('✅ Push notification sent! Check your mobile device.');
      } else {
        alert('⚠️ Push API call failed (likely CORS issue).\n\n✅ Notification saved in database.\n📱 Mobile app will receive it when it syncs.\n\nCheck browser console (F12) for details.');
      }
    } catch (error) {
      console.error('🔔 [Settings] Test error:', error);
      const errorMsg = `Error: ${error.message}\n\nStack: ${error.stack}\n\nCheck browser console (F12) for more details.`;
      setDebugInfo(errorMsg);
      alert(`Error: ${error.message}\n\nCheck browser console (F12) for details.`);
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
            <Link 
              to="/privacy-policy"
              className={`w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between`}
            >
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
            </Link>
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

        {/* Logout */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <button 
              onClick={handleLogout}
              className={`w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-600`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t('logOut')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('signOutOfAccount')}</div>
                </div>
              </div>
              <ChevronRight size={20} className={`text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
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

        {/* Debug Push Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 overflow-hidden">
          <div className="p-6 border-b border-blue-100 dark:border-blue-900/30">
            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">🧪 Debug Push Notifications</h2>
          </div>
          <div className="p-6 space-y-4">
            <button 
              onClick={testPushNotification}
              className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              Test Push Notification to My Device
            </button>
            {debugInfo && (
              <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-xl text-xs font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {debugInfo}
              </pre>
            )}
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
