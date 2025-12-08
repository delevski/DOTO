import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { colors, spacing, borderRadius } from '../styles/theme';
import { useUserStats } from '../hooks/useUserStats';
import { useUserProfileSync } from '../hooks/useUserProfileSync';
import { getAllBadges, getUserEarnedBadges } from '../utils/badges';
import { clearPostsCache } from '../hooks/useFilteredPosts';
import Icon from '../components/Icon';

function ProfileScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();

  // Track screen focus - only query when focused
  const [queryEnabled, setQueryEnabled] = useState(false);

  // Track mounted state for cleanup
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Only enable query when screen is focused
  useFocusEffect(
    useCallback(() => {
      setQueryEnabled(true);
      return () => setQueryEnabled(false);
    }, [])
  );

  // Sync user profile from InstantDB (picks up changes made from web app)
  useUserProfileSync({ enabled: queryEnabled });

  // Use the comprehensive useUserStats hook with focus-based query (same logic as webapp)
  const stats = useUserStats(user?.id, { enabled: queryEnabled });
    
  // Get all badges and calculate earned ones using shared badge logic
  const allBadges = useMemo(() => getAllBadges(), []);
  
  const earnedBadgeIds = useMemo(() => {
    if (stats.isLoading) return [];
    return getUserEarnedBadges(stats);
  }, [stats]);

  const themeColors = useMemo(() => ({
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  }), [darkMode]);

  // Format points with commas
  const formatPoints = useCallback((points) => {
    return points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }, []);

  const handleLogout = useCallback(async () => {
    // Clear the posts cache before logging out
    clearPostsCache();
    // Logout
    await logout();
  }, [logout]);

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Text style={styles.emptyIcon}>👤</Text>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{t('profile.notLoggedIn')}</Text>
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          {t('profile.pleaseLoginToView')}
        </Text>
      </View>
    );
  }

  // Loading state
  if (stats.isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          {t('common.loading') || 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: themeColors.surface }]}>
          <Image 
            source={{ uri: user.avatar || `https://i.pravatar.cc/150?u=${user.id}` }}
            style={styles.avatar}
          />
          <Text style={[styles.userName, { color: themeColors.text }]}>{user.name}</Text>
          <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>{user.email}</Text>
          
          {user.bio && (
            <Text style={[styles.userBio, { color: themeColors.textSecondary, textAlign: 'center' }]}>{user.bio}</Text>
          )}

          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card - Enhanced with points and streak */}
        <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
          <Text style={[styles.statsTitle, { textAlign: 'center' }]}>{t('profile.yourImpact')}</Text>
          <View style={[styles.statsRow, { flexDirection: rtlStyles.row }]}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageRating || '-'}</Text>
              <Text style={styles.statLabel}>{t('profile.rating')} ⭐</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.postsCreated}</Text>
              <Text style={styles.statLabel}>{t('profile.posts')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
              <Text style={styles.statLabel}>{t('profile.completed')}</Text>
            </View>
          </View>
          
          {/* Points and Streak Row */}
          <View style={[styles.statsRowSecondary, { flexDirection: rtlStyles.row }]}>
            <View style={styles.statItemSecondary}>
              <Text style={styles.statValueSecondary}>{formatPoints(stats.totalPoints)}</Text>
              <Text style={styles.statLabelSecondary}>{t('profile.points') || 'Points'}</Text>
            </View>
            {stats.currentStreak > 0 && (
              <View style={styles.statItemSecondary}>
                <Text style={styles.statValueSecondary}>🔥 {stats.currentStreak}</Text>
                <Text style={styles.statLabelSecondary}>{t('profile.streak') || 'Day Streak'}</Text>
              </View>
            )}
            <View style={styles.statItemSecondary}>
              <Text style={styles.statValueSecondary}>{earnedBadgeIds.length}</Text>
              <Text style={styles.statLabelSecondary}>{t('profile.badgesEarned') || 'Badges'}</Text>
            </View>
          </View>
        </View>

        {/* Badges - Using shared badge system */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <View style={[styles.sectionHeader, { flexDirection: rtlStyles.row }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {t('profile.badges')}
          </Text>
            <Text style={[styles.badgeCount, { color: themeColors.textSecondary }]}>
              {earnedBadgeIds.length} / {allBadges.length}
            </Text>
          </View>
          <View style={styles.badgesGrid}>
            {allBadges.map((badge) => {
              const earned = earnedBadgeIds.includes(badge.id);
              return (
                <View 
                  key={badge.id}
                  style={[
                    styles.badgeItem,
                    earned ? { backgroundColor: badge.color + '20' } : styles.badgeItemLocked
                  ]}
                >
                  <View style={[
                    styles.badgeIconContainer,
                    earned ? { backgroundColor: badge.color } : styles.badgeIconContainerLocked
                  ]}>
                    <Icon 
                      name={earned ? badge.icon : 'lock-closed-outline'} 
                      size={24} 
                      color={earned ? '#fff' : '#9CA3AF'}
                    />
                  </View>
                  <Text style={[
                    styles.badgeName, 
                    { color: earned ? themeColors.text : themeColors.textSecondary }
                  ]}>
                    {t(badge.name)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
            {t('profile.quickActions')}
          </Text>
          
          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.actionIcon}>
              <Icon name="notifications" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: themeColors.text }]}>{t('notifications.title') || 'Notifications'}</Text>
            <View style={[styles.actionArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.actionIcon}>
              <Icon name="settings" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: themeColors.text }]}>{t('profile.settings')}</Text>
            <View style={[styles.actionArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => navigation.navigate('Feed', { screen: 'myPosts' })}
          >
            <View style={styles.actionIcon}>
              <Icon name="document-text" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: themeColors.text }]}>{t('profile.myPosts')}</Text>
            <View style={[styles.actionArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomWidth: 0, flexDirection: rtlStyles.row }]}
            onPress={handleLogout}
          >
            <View style={styles.actionIcon}>
              <Icon name="log-out" size={22} color={colors.error} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.error }]}>{t('auth.logout')}</Text>
            <View style={[styles.actionArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: themeColors.textSecondary }]}>
            {t('profile.appVersion')}
          </Text>
          <Text style={[styles.appTagline, { color: themeColors.textSecondary }]}>
            {t('profile.tagline')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(ProfileScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 50,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  profileCard: {
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.lg,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  userBio: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsCard: {
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  statsRow: {
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statsRowSecondary: {
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItemSecondary: {
    alignItems: 'center',
    flex: 1,
  },
  statValueSecondary: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statLabelSecondary: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badgeCount: {
    fontSize: 14,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
  },
  sectionCard: {
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeItem: {
    alignItems: 'center',
    width: '30%',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  badgeItemLocked: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    opacity: 0.6,
  },
  badgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeIconContainerLocked: {
    backgroundColor: '#E5E7EB',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionItem: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  actionArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appVersion: {
    fontSize: 13,
    fontWeight: '500',
  },
  appTagline: {
    fontSize: 12,
    marginTop: 4,
  },
});
