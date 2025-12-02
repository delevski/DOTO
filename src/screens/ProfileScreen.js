import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';

const BADGES = [
  { id: 'first_post', name: 'First Post', icon: '✍️', description: 'Created first help request' },
  { id: 'first_claim', name: 'First Claim', icon: '🤝', description: 'Claimed first task' },
  { id: 'five_posts', name: 'Five Posts', icon: '📝', description: 'Created five requests' },
  { id: 'super_helper', name: 'Super Helper', icon: '🦸', description: 'Completed 10 tasks' },
  { id: 'community_hero', name: 'Community Hero', icon: '🏆', description: 'Completed 25 tasks' },
];

export default function ProfileScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const darkMode = useSettingsStore((state) => state.darkMode);

  // Fetch user stats from InstantDB
  const { isLoading, data } = db.useQuery({ 
    posts: {},
  });

  const allPosts = data?.posts || [];

  // Calculate stats
  const stats = useMemo(() => {
    if (!user) return { postsCreated: 0, tasksCompleted: 0, avgRating: 0 };

    const postsCreated = allPosts.filter(p => p.authorId === user.id).length;
    const tasksCompleted = allPosts.filter(p => p.approvedClaimerId === user.id && p.isCompleted).length;
    
    // Calculate average rating from completed tasks
    const completedWithRating = allPosts.filter(
      p => p.approvedClaimerId === user.id && p.helperRating
    );
    const avgRating = completedWithRating.length > 0
      ? (completedWithRating.reduce((sum, p) => sum + p.helperRating, 0) / completedWithRating.length).toFixed(1)
      : 0;

    return { postsCreated, tasksCompleted, avgRating };
  }, [allPosts, user]);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Text style={styles.emptyIcon}>👤</Text>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Not Logged In</Text>
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          Please login to view your profile
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
            <Text style={[styles.userBio, { color: themeColors.textSecondary }]}>{user.bio}</Text>
          )}

          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.statsTitle}>Your Impact</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgRating || '-'}</Text>
              <Text style={styles.statLabel}>Rating ⭐</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.postsCreated}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Badges</Text>
          <View style={styles.badgesGrid}>
            {BADGES.map((badge) => {
              const earned = user.earnedBadges?.includes(badge.id);
              return (
                <View 
                  key={badge.id}
                  style={[
                    styles.badgeItem,
                    !earned && styles.badgeItemLocked
                  ]}
                >
                  <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                    {badge.icon}
                  </Text>
                  <Text style={[
                    styles.badgeName, 
                    { color: earned ? themeColors.text : themeColors.textSecondary }
                  ]}>
                    {badge.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomColor: themeColors.border }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={[styles.actionLabel, { color: themeColors.text }]}>Settings</Text>
            <Text style={[styles.actionArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomColor: themeColors.border }]}
            onPress={() => navigation.navigate('Feed', { screen: 'myPosts' })}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={[styles.actionLabel, { color: themeColors.text }]}>My Posts</Text>
            <Text style={[styles.actionArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
          >
            <Text style={styles.actionIcon}>🚪</Text>
            <Text style={[styles.actionLabel, { color: colors.error }]}>Logout</Text>
            <Text style={[styles.actionArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: themeColors.textSecondary }]}>
            DOTO v1.0.0
          </Text>
          <Text style={[styles.appTagline, { color: themeColors.textSecondary }]}>
            Do One Thing Others
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
    textAlign: 'center',
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
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
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
  sectionCard: {
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  badgeIconLocked: {
    opacity: 0.3,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  actionIcon: {
    fontSize: 22,
    marginRight: spacing.lg,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  actionArrow: {
    fontSize: 24,
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
