import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import Icon from './Icon';

/**
 * NotificationBadge component that shows a bell icon with unread count
 * Navigates to NotificationsScreen when pressed
 */
function NotificationBadge({ style, iconColor, showLabel = false }) {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Query notifications
  const { data } = db.useQuery(isAuthenticated && user?.id ? {
    notifications: {}
  } : null);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    if (!data?.notifications || !user?.id) return 0;
    
    const currentUserId = String(user.id);
    return data.notifications.filter(n => 
      String(n.userId) === currentUserId && !n.read
    ).length;
  }, [data?.notifications, user?.id]);

  const handlePress = () => {
    navigation.navigate('Notifications');
  };

  if (!isAuthenticated) return null;

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <Icon 
          name="notifications" 
          size={22} 
          color={iconColor || colors.primary} 
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: iconColor || colors.primary }]}>
          Notifications
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(NotificationBadge);

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    marginLeft: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
  },
});

