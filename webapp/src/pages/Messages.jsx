import React from 'react';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';

export default function Messages() {
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';

  return (
    <div className={`max-w-5xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('messages')}</h1>
          <p className="text-gray-500 dark:text-gray-400">Connect with your community</p>
        </div>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            <Search size={20} className={`absolute ${isRTL ? 'right' : 'left'}-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500`} />
            <input 
              type="text" 
              placeholder={t('search') + '...'} 
              className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm w-64 text-gray-900 dark:text-white`}
            />
          </div>
          <button className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-4 group ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img 
                src={`https://i.pravatar.cc/150?u=message${i}`} 
                alt="User" 
                className="w-14 h-14 rounded-full ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-red-200 dark:group-hover:ring-red-800 transition-all" 
              />
              <div className="flex-1 min-w-0">
                <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h3 className="font-bold text-gray-900 dark:text-white">User Name {i}</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">10:3{i} AM</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm truncate">Hey, are you still available to help with the moving task this weekend?</p>
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical size={18} className="text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
