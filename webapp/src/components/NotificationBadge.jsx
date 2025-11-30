import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { db } from '../lib/instant';

export default function NotificationBadge() {
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const isRTL = language === 'he';

  const { data, isLoading, error } = db.useQuery({
    notifications: {}
  });

  const allNotifications = data?.notifications || [];
  // Convert both IDs to strings for comparison to handle type mismatches
  const currentUserId = user?.id ? String(user.id) : null;
  const notifications = allNotifications.filter(n => {
    const notificationUserId = n.userId ? String(n.userId) : null;
    return notificationUserId === currentUserId;
  });
  const unreadCount = notifications.filter(n => !n.read).length;

  // Debug logging - always log to track notifications
  useEffect(() => {
    console.log('=== NotificationBadge Debug ===');
    console.log('Loading:', isLoading);
    console.log('Error:', error);
    console.log('All notifications count:', allNotifications.length);
    console.log('All notifications:', allNotifications);
    console.log('Current user ID:', currentUserId);
    console.log('User notifications:', notifications);
    console.log('Unread count:', unreadCount);
    console.log('==============================');
  }, [allNotifications, currentUserId, notifications, unreadCount, isLoading, error]);

  if (!user) return null;

  return (
    <Link
      to="/notifications"
      className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative ${isRTL ? 'flex-row-reverse' : ''}`}
    >
      <Bell size={22} className="text-gray-600 dark:text-gray-300" />
      {unreadCount > 0 && (
        <span
          className={`absolute top-1.5 ${isRTL ? 'left' : 'right'}-1.5 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white`}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

