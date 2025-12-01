import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db } from '../lib/instant';
import { useAuth } from '../context/AuthContext';
import { t } from '../utils/translations';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  // Fetch user's posts and stats
  const { data } = db.useQuery({
    posts: user?.id ? { $: { where: { authorId: user.id } } } : {},
  });

  const userPosts = data?.posts || [];
  const completedTasks = userPosts.filter(p => p.approvedClaimerId).length;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      id: 'editProfile',
      icon: 'person-outline',
      label: t('editProfile'),
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'myPosts',
      icon: 'document-text-outline',
      label: t('myPosts'),
      onPress: () => navigation.navigate('Feed', { tab: 'myPosts' }),
    },
    {
      id: 'myClaims',
      icon: 'hand-left-outline',
      label: t('myClaim'),
      onPress: () => navigation.navigate('Feed', { tab: 'myClaim' }),
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: t('settings'),
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'privacy',
      icon: 'shield-checkmark-outline',
      label: 'Privacy Policy',
      onPress: () => {/* TODO */},
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => {/* TODO */},
    },
  ];

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.notLoggedIn}>
          <Ionicons name="person-circle-outline" size={80} color={colors.border} />
          <Text style={styles.notLoggedInText}>Please log in to view your profile</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>{t('logIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText}>{user.location}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userPosts.length}</Text>
          <Text style={styles.statLabel}>{t('postsCreated')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedTasks}</Text>
          <Text style={styles.statLabel}>{t('tasksCompleted')}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.ratingContainer}>
            <Text style={styles.statNumber}>{user.rating?.toFixed(1) || '0.0'}</Text>
            <Ionicons name="star" size={16} color="#FBBF24" />
          </View>
          <Text style={styles.statLabel}>{t('angelRating')}</Text>
        </View>
      </View>

      {/* Bio Section */}
      {user.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{user.bio}</Text>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              index === 0 && styles.menuItemFirst,
              index === menuItems.length - 1 && styles.menuItemLast,
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text style={styles.logoutText}>{t('logOut')}</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.versionText}>DOTO v1.0.0</Text>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.white,
    marginBottom: spacing.md,
  },
  userName: {
    ...typography.h2,
    color: colors.white,
    marginBottom: 4,
  },
  userEmail: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  locationText: {
    ...typography.small,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  statNumber: {
    ...typography.h2,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bioSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bioText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  menuSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemFirst: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.tagBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.sm,
  },
  logoutText: {
    ...typography.bodySemibold,
    color: colors.error,
  },
  versionText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  notLoggedIn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  notLoggedInText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  loginButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
