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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

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

  useEffect(() => {
    // Initialize Google Sign-In when component mounts and Google API is loaded
    const initGoogleSignIn = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        console.warn('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in your .env file.');
        return;
      }

      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleLink,
          });
        } catch (err) {
          console.error('Error initializing Google for Settings:', err);
        }
      }
    };

    if (window.google) {
      initGoogleSignIn();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initGoogleSignIn();
        }
      }, 100);
      setTimeout(() => clearInterval(checkGoogle), 10000);
    }
  }, []);

  const handleGoogleLink = async (response) => {
    setIsGoogleLoading(true);
    setGoogleError('');

    try {
      const credential = response.credential;
      await db.auth.signInWithIdToken({
        clientName: 'google-web2',
        idToken: credential
      });

      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const userInfo = JSON.parse(jsonPayload);

      // Update user in InstantDB to mark as linked
      await db.transact(
        db.tx.users[user.id].update({
          authProvider: 'google', // Explicitly mark as Google-enabled
          // We don't change email to avoid account hijacking, but we link the provider
          updatedAt: Date.now(),
        })
      );

      alert(t('googleLinked') || 'Google account linked successfully!');
    } catch (err) {
      console.error('Google linking error:', err);
      setGoogleError(t('failedToLinkGoogle') || 'Failed to link Google account.');
      alert(t('failedToLinkGoogle') || 'Failed to link Google account. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const triggerGoogleLogin = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      alert('Google Sign-In is not available yet. Please refresh the page.');
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

        {/* Connected Accounts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('connectedAccounts')}</h2>
          </div>
          <div className="p-6">
            <button
              onClick={triggerGoogleLogin}
              disabled={isGoogleLoading || user?.authProvider === 'google'}
              className={`w-full flex items-center justify-between p-4 rounded-xl border ${user?.authProvider === 'google'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                } transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {user?.authProvider === 'google' ? t('googleLinked') : t('connectGoogle')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.authProvider === 'google' ? user.email : t('signInToContinue')}
                  </div>
                </div>
              </div>
              {user?.authProvider === 'google' ? (
                <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full">
                  <Check size={16} className="text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <ChevronRight size={20} className={`text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
              )}
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
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between ${language === lang.code
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
