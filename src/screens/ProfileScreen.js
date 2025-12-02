import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { getAllBadges, getUserEarnedBadges, calculatePoints } from '../utils/badges';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

export default function ProfileScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();

  // Fetch user's posts and claims
  const { data } = db.useQuery({ 
    posts: {},
    users: { $: { where: { id: user?.id } } }
  });

  const allPosts = data?.posts || [];
  const dbUser = data?.users?.[0];

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  // Calculate stats
  const stats = useMemo(() => {
    const myPosts = allPosts.filter(p => p.authorId === user?.id);
    const completedTasks = allPosts.filter(p => p.approvedClaimerId === user?.id && p.isCompleted);
    
    return {
      postsCreated: myPosts.length,
      tasksCompleted: completedTasks.length,
      averageRating: dbUser?.rating || user?.rating || 4.5,
      currentStreak: dbUser?.streak || 3,
      isVerified: true,
      isEarlyAdopter: true,
      conversationsStarted: 2,
    };
  }, [allPosts, user, dbUser]);

  // Get earned badges
  const allBadges = getAllBadges();
  const earnedBadgeIds = getUserEarnedBadges(stats);
  const points = calculatePoints(stats);

  const handleLogout = async () => {
    Alert.alert(
      t('logOut'),
      'Are you sure you want to log out?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('logOut'), 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const quickActions = [
    { 
      icon: 'person-outline', 
      label: t('editProfile'), 
      onPress: () => navigation.navigate('EditProfile') 
    },
    { 
      icon: 'settings-outline', 
      label: t('settings'), 
      onPress: () => navigation.navigate('Settings') 
    },
    { 
      icon: 'help-circle-outline', 
      label: t('helpSupport'), 
      onPress: () => Alert.alert('Help', 'Contact support@doto.app') 
    },
    { 
      icon: 'log-out-outline', 
      label: t('logOut'), 
      onPress: handleLogout,
      danger: true 
    },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <Image
            source={{ uri: user?.avatar || `https://i.pravatar.cc/150?u=${user?.id}` }}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              {stats.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.verifiedText}>{t('verified')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.memberSince}>{t('communityHelperSince')}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="star" size={20} color={colors.star} />
            </View>
            <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>{t('angelRating')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="document-text" size={20} color="#60A5FA" />
            </View>
            <Text style={styles.statValue}>{stats.postsCreated}</Text>
            <Text style={styles.statLabel}>{t('postsCreated')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-done" size={20} color="#34D399" />
            </View>
            <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
            <Text style={styles.statLabel}>{t('tasksCompleted')}</Text>
          </View>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          <Text style={styles.editProfileText}>{t('editProfile')}</Text>
        </TouchableOpacity>
      </View>

      {/* Badges Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          {t('badgesEarned')} ({earnedBadgeIds.length}/{allBadges.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
          {allBadges.map((badge) => {
            const isEarned = earnedBadgeIds.includes(badge.id);
            return (
              <View 
                key={badge.id} 
                style={[
                  styles.badgeItem,
                  !isEarned && styles.badgeItemLocked,
                ]}
              >
                <View style={[
                  styles.badgeIcon,
                  { backgroundColor: isEarned ? badge.color + '20' : themeColors.border },
                ]}>
                  <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                </View>
                <Text style={[
                  styles.badgeName,
                  { color: isEarned ? themeColors.text : themeColors.textSecondary },
                ]} numberOfLines={1}>
                  {badge.name}
                </Text>
                {!isEarned && (
                  <Ionicons name="lock-closed" size={12} color={themeColors.textSecondary} style={styles.lockIcon} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Impact Stats */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          {t('yourImpact')}
        </Text>
        <View style={styles.impactGrid}>
          <View style={[styles.impactCard, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-done-circle" size={32} color={colors.success} />
            <Text style={[styles.impactValue, { color: colors.success }]}>
              {stats.tasksCompleted}
            </Text>
            <Text style={[styles.impactLabel, { color: colors.success }]}>
              {t('tasksCompleted')}
            </Text>
          </View>
          <View style={[styles.impactCard, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="star" size={32} color={colors.warning} />
            <Text style={[styles.impactValue, { color: colors.warning }]}>
              {stats.averageRating.toFixed(1)}
            </Text>
            <Text style={[styles.impactLabel, { color: colors.warning }]}>
              {t('angelRating')}
            </Text>
          </View>
          <View style={[styles.impactCard, { backgroundColor: colors.infoLight }]}>
            <Ionicons name="ribbon" size={32} color={colors.info} />
            <Text style={[styles.impactValue, { color: colors.info }]}>
              {earnedBadgeIds.length}
            </Text>
            <Text style={[styles.impactLabel, { color: colors.info }]}>
              {t('badgesEarned')}
            </Text>
          </View>
          <View style={[styles.impactCard, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="trophy" size={32} color={colors.primary} />
            <Text style={[styles.impactValue, { color: colors.primary }]}>
              {points}
            </Text>
            <Text style={[styles.impactLabel, { color: colors.primary }]}>
              {t('points')}
            </Text>
          </View>
        </View>

        {/* Streak */}
        <View style={[styles.streakCard, { borderColor: themeColors.border }]}>
          <View style={styles.streakIcon}>
            <Text style={styles.streakEmoji}>🔥</Text>
          </View>
          <View style={styles.streakInfo}>
            <Text style={[styles.streakValue, { color: themeColors.text }]}>
              {stats.currentStreak} {stats.currentStreak === 1 ? t('day') : t('days')}
            </Text>
            <Text style={[styles.streakLabel, { color: themeColors.textSecondary }]}>
              {t('currentStreak')}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          {t('quickActions')}
        </Text>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionItem,
              index < quickActions.length - 1 && { borderBottomColor: themeColors.border, borderBottomWidth: 1 },
            ]}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View style={[
              styles.actionIcon,
              { backgroundColor: action.danger ? colors.errorLight : themeColors.background },
            ]}>
              <Ionicons 
                name={action.icon} 
                size={22} 
                color={action.danger ? colors.error : colors.primary} 
              />
            </View>
            <Text style={[
              styles.actionLabel,
              { color: action.danger ? colors.error : themeColors.text },
            ]}>
              {action.label}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 50,
    paddingBottom: 100,
  },
  headerCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    marginRight: spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: '#fff',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  verifiedText: {
    color: '#fff',
    fontSize: typography.xs,
    fontWeight: '600',
  },
  userEmail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.sm,
    marginBottom: spacing.xs,
  },
  memberSince: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: typography.xs,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    color: '#fff',
    fontSize: typography.lg,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  editProfileText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: typography.base,
  },
  section: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  badgesScroll: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: spacing.lg,
    width: 72,
  },
  badgeItemLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeName: {
    fontSize: typography.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: 0,
    right: 8,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  impactCard: {
    width: '47%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  impactValue: {
    fontSize: typography.xxl,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  impactLabel: {
    fontSize: typography.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakInfo: {
    flex: 1,
  },
  streakValue: {
    fontSize: typography.lg,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: typography.sm,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: typography.md,
    fontWeight: '500',
  },
});
