import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { Map, Home, MessageCircle, User, Menu, Plus, X, Shield, HelpCircle, Settings as SettingsIcon, Bell, Search, TrendingUp, LogOut, Sparkles, Calendar } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/useStore';
import { useTranslation } from '../utils/translations';
import NotificationBadge from './NotificationBadge';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { darkMode } = useSettingsStore();
  const { language } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const t = useTranslation();
  const isRTL = language === 'he';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden`}>
      {/* Sidebar Navigation */}
      {/* Uses logical border properties: border-e (end) adapts automatically to RTL/LTR */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 shadow-sm`}>
        {/* Logo */}
        <div className={`p-6 border-b border-gray-100 dark:border-gray-700 flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'}`}>
          {isSidebarOpen ? (
            <span className="text-2xl font-extrabold bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">DOTO</span>
          ) : (
            <span className="text-xl font-extrabold text-red-600">D</span>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavItem to="/feed" icon={<Home size={20} />} label={t('feed')} isCollapsed={!isSidebarOpen} />
          <NavItem to="/map" icon={<Map size={20} />} label={t('map')} isCollapsed={!isSidebarOpen} />
          <NavItem to="/messages" icon={<MessageCircle size={20} />} label={t('messages')} isCollapsed={!isSidebarOpen} />
          <NavItem to="/profile" icon={<User size={20} />} label={t('profile')} isCollapsed={!isSidebarOpen} />
          <NavItem to="/profile" icon={<TrendingUp size={20} />} label={t('topWeekly')} isCollapsed={!isSidebarOpen} />
          
          <div className="my-4 border-t border-gray-100 dark:border-gray-700"></div>
          
          <NavItem to="/profile" icon={<Shield size={20} />} label={t('badges')} isCollapsed={!isSidebarOpen} />
          <NavItem to="/profile" icon={<HelpCircle size={20} />} label={t('help')} isCollapsed={!isSidebarOpen} />
          <NavItem to="/settings" icon={<SettingsIcon size={20} />} label={t('settings')} isCollapsed={!isSidebarOpen} />
        </nav>

        {/* Create Buttons */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <Link 
            to="/new-post" 
            className={`w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-center`}
          >
            <Plus size={20} />
            {isSidebarOpen && <span>{t('createPost')}</span>}
          </Link>
          <Link 
            to="/new-community-event" 
            className={`w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-center`}
          >
            <Sparkles size={20} />
            {isSidebarOpen && <span>{t('createEvent') || 'Create Event'}</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} shadow-sm z-10`}>
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                type="text" 
                placeholder={t('search') + '...'} 
                className="w-full ps-10 pe-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
              />
            </div>
          </div>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''} ms-6`}>
            <NotificationBadge />
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <img src={user?.avatar || 'https://i.pravatar.cc/150?u=user'} alt="Profile" className="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />
                {isSidebarOpen && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name || 'User'}</span>}
              </button>
              
              {showProfileMenu && (
                <div className="absolute end-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <Link 
                    to="/profile" 
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                  >
                    {t('profile')}
                  </Link>
                  <Link 
                    to="/settings" 
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                  >
                    {t('settings')}
                  </Link>
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setShowProfileMenu(false);
                    }}
                    className={`w-full px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm text-red-600 dark:text-red-400 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <LogOut size={16} className={isRTL ? 'rtl-flip' : ''} />
                    {t('logOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Click outside to close menu */}
          {showProfileMenu && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowProfileMenu(false)}
            ></div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, isCollapsed }) {
  const { darkMode } = useSettingsStore();
  const { language } = useSettingsStore();
  const isRTL = language === 'he';

  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center ${isRTL ? 'flex-row-reverse' : ''} gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
          isActive 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
        }`
      }
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
}
