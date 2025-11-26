import React from 'react';
import { Settings as SettingsIcon, Award, HelpCircle, Edit3, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };
  return (
    <div className={`max-w-5xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('profile')}</h1>
        <Link to="/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <SettingsIcon size={24} className="text-gray-600 dark:text-gray-300" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <div className={`flex items-start gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img 
                src={user?.avatar || 'https://i.pravatar.cc/150?u=user'} 
                alt="Profile" 
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-gray-50 dark:ring-gray-700" 
              />
              <div className="flex-1">
                <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name || 'User'}</h2>
                  <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">{t('verified')}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('communityHelperSince')}</p>
                <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{user?.rating || 4.9}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('angelRating')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('postsCreated')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">8</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('tasksCompleted')}</div>
                  </div>
                </div>
              </div>
              <Link 
                to="/edit-profile"
                className={`px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Edit3 size={18} />
                {t('editProfile')}
              </Link>
            </div>
          </div>

          {/* Badges Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Award size={24} className="text-yellow-500" />
              {t('badgesEarned')}
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-2 flex items-center justify-center text-white font-bold text-xl">
                    {i}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Badge {i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-gradient-to-br from-red-600 to-rose-500 rounded-2xl shadow-xl p-6 text-white">
            <h3 className="font-bold text-lg mb-4">{t('yourImpact')}</h3>
            <div className="space-y-4">
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">{t('tasksCompleted')}</span>
                <span className="font-bold text-xl">24</span>
              </div>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">{t('angelRating')}</span>
                <span className="font-bold text-xl">4.9 ⭐</span>
              </div>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">{t('badgesEarned')}</span>
                <span className="font-bold text-xl">8</span>
              </div>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">{t('points')}</span>
                <span className="font-bold text-xl">1,250</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t('quickActions')}</h3>
            <div className="space-y-2">
              <button className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <HelpCircle size={20} className="text-blue-500" />
                <span className="font-medium">{t('helpSupport')}</span>
              </button>
              <Link 
                to="/settings"
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
              >
                <SettingsIcon size={20} className="text-gray-500" />
                <span className="font-medium">{t('settings')}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className={`w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center gap-3 text-red-600 dark:text-red-400 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
              >
                <LogOut size={20} />
                <span className="font-medium">{t('logOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
