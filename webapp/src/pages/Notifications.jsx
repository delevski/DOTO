import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Clock, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';

export default function Notifications() {
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const navigate = useNavigate();

  // Query all notifications
  const { isLoading, error, data } = db.useQuery({
    notifications: {}
  });

  const allNotifications = data?.notifications || [];
  // Convert both IDs to strings for comparison to handle type mismatches
  const currentUserId = user?.id ? String(user.id) : null;
  const notifications = allNotifications.filter(n => {
    const notificationUserId = n.userId ? String(n.userId) : null;
    return notificationUserId === currentUserId;
  });

  // Debug logging (only in development and when data changes)
  const prevNotificationsRef = useRef(0);
  useEffect(() => {
    // Only log if notifications count changed to prevent excessive logging
    if (allNotifications.length !== prevNotificationsRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('=== Notifications Page Debug ===');
        console.log('All notifications in DB:', allNotifications.length);
        console.log('Filtered notifications for user:', notifications.length);
        console.log('================================');
      }
      prevNotificationsRef.current = allNotifications.length;
    }
  }, [allNotifications.length, notifications.length]);
  const sortedNotifications = [...notifications].sort(
    (a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0)
  );
  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ${days > 1 ? t('days') : t('day')} ${t('ago')}`;
    if (hours > 0) return `${hours} ${hours > 1 ? t('hrs') : t('hr')} ${t('ago')}`;
    return t('justNow');
  };

  const handleMarkAsRead = (notificationId) => {
    db.transact(
      db.tx.notifications[notificationId].update({
        read: true
      })
    );
  };

  const handleMarkAllAsRead = () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    const updates = unreadNotifications.map(n =>
      db.tx.notifications[n.id].update({ read: true })
    );

    db.transact(...updates);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    navigate(`/post/${notification.postId}`);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t('mustBeLoggedIn')}</p>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Bell size={28} className="text-red-600" />
            {t('notifications')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? t('notification') : t('notifications')} ${t('unread') || 'unread'}`
              : t('noNotifications')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className={`px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Check size={18} />
            {t('markAllAsRead') || 'Mark All as Read'}
          </button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-red-500 text-lg">{t('errorLoadingPosts')} {error.message}</p>
        </div>
      ) : sortedNotifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Bell size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                notification.read
                  ? 'border-gray-100 dark:border-gray-700'
                  : 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20'
              }`}
            >
              <div className="p-6">
                <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      notification.read
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}
                  >
                    {notification.read ? (
                      <CheckCircle size={24} className="text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Bell size={24} className="text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold text-gray-900 dark:text-white mb-1 ${
                            !notification.read ? 'font-bold' : ''
                          }`}
                        >
                          {notification.message || t('youWereApproved')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {notification.postTitle || t('helpNeeded')}
                        </p>
                        <div className={`flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Clock size={12} />
                          <span>{formatTime(notification.timestamp || notification.createdAt)}</span>
                        </div>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Check size={14} />
                          {t('markAsRead')}
                        </button>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    size={20}
                    className={`flex-shrink-0 text-gray-400 dark:text-gray-500 ${isRTL ? 'rtl-flip' : ''}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

