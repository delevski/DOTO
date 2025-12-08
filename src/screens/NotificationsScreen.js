import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import Icon from '../components/Icon';

function NotificationsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  
  const [refreshing, setRefreshing] = React.useState(false);

  // Query all notifications for current user
  const { isLoading, error, data } = db.useQuery(isAuthenticated && user?.id ? {
    notifications: {}
  } : null);

  // Filter notifications for current user
  const notifications = useMemo(() => {
    if (!data?.notifications || !user?.id) return [];
    
    const currentUserId = String(user.id);
    return data.notifications
      .filter(n => String(n.userId) === currentUserId)
      .sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
  }, [data?.notifications, user?.id]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length,
    [notifications]
  );

  const themeColors = useMemo(() => ({
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  }), [darkMode]);

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return t('feed.daysAgo', { count: days }) || `${days}d ago`;
    if (hours > 0) return t('feed.hoursAgo', { count: hours }) || `${hours}h ago`;
    return t('feed.justNow') || 'Just now';
  }, [t]);

  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await db.transact(
        db.tx.notifications[notificationId].update({
          read: true
        })
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    try {
      const updates = unread.map(n =>
        db.tx.notifications[n.id].update({ read: true })
      );
      await db.transact(...updates);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [notifications]);

  const handleNotificationPress = useCallback((notification) => {
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    // Navigate to post
    if (notification.postId) {
      navigation.navigate('PostDetails', { postId: notification.postId });
    }
  }, [handleMarkAsRead, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // InstantDB auto-refreshes, simulate delay for UX
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getNotificationIcon = useCallback((type) => {
    switch (type) {
      case 'post_claimed':
        return { name: 'hand-left', color: colors.primary };
      case 'claimer_approved':
        return { name: 'checkmark-circle', color: '#059669' };
      case 'task_marked_complete':
        return { name: 'checkmark-done', color: '#3B82F6' };
      case 'task_completed':
        return { name: 'star', color: '#F59E0B' };
      default:
        return { name: 'notifications', color: colors.primary };
    }
  }, []);

  const renderNotification = useCallback(({ item }) => {
    const icon = getNotificationIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { 
            backgroundColor: item.read ? themeColors.surface : (darkMode ? '#1E293B' : '#FEF2F2'),
            borderColor: themeColors.border 
          }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Icon name={icon.name} size={22} color={icon.color} />
        </View>
        
        <View style={[styles.contentContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text 
            style={[
              styles.notificationMessage, 
              { 
                color: themeColors.text,
                textAlign: rtlStyles.textAlign,
                fontWeight: item.read ? '400' : '600'
              }
            ]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          
          {item.postTitle && (
            <Text 
              style={[styles.postTitle, { color: colors.primary, textAlign: rtlStyles.textAlign }]}
              numberOfLines={1}
            >
              "{item.postTitle}"
            </Text>
          )}
          
          <View style={[styles.metaRow, { flexDirection: rtlStyles.row }]}>
            <Icon name="time-outline" size={12} color={themeColors.textSecondary} />
            <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
              {formatTime(item.timestamp || item.createdAt)}
            </Text>
            
            {item.rating && (
              <View style={[styles.ratingBadge, { flexDirection: rtlStyles.row }]}>
                <Icon name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            )}
          </View>
        </View>

        {!item.read && (
          <View style={styles.unreadDot} />
        )}
        
        <Icon 
          name={isRTL ? 'chevron-back' : 'chevron-forward'} 
          size={18} 
          color={themeColors.textSecondary} 
        />
      </TouchableOpacity>
    );
  }, [themeColors, darkMode, isRTL, rtlStyles, formatTime, getNotificationIcon, handleNotificationPress]);

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Icon name="notifications-off-outline" size={64} color={themeColors.textSecondary} />
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          {t('auth.pleaseLogin') || 'Please login to view notifications'}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          {t('notifications.loading') || 'Loading notifications...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('notifications.title') || 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
              {t('notifications.unreadCount', { count: unreadCount }) || `${unreadCount} unread`}
            </Text>
          )}
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Icon name="checkmark-done" size={18} color={colors.primary} />
            <Text style={styles.markAllText}>
              {t('notifications.markAllRead') || 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.emptyIconContainer}>
            <Icon name="notifications-outline" size={64} color={themeColors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('notifications.noNotifications') || 'No Notifications'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            {t('notifications.noNotificationsDesc') || "You'll see notifications here when someone interacts with your posts"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

export default React.memo(NotificationsScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  postTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  metaRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: 12,
  },
  ratingBadge: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: 16,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
  },
});

