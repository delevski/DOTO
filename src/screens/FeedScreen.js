import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import Icon from '../components/Icon';
import { useFilteredPosts } from '../hooks/useFilteredPosts';
import OptimizedImage, { OptimizedAvatar, OptimizedPostImage } from '../components/OptimizedImage';

// Maximum number of posts to render initially (for memory optimization)
const INITIAL_RENDER_COUNT = 10;
const MAX_RENDER_PER_BATCH = 5;

function FeedScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  const { alert } = useDialog();
  
  const [activeTab, setActiveTab] = useState('nearby');
  const [refreshing, setRefreshing] = useState(false);
  
  // Track mounted state for cleanup
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Use the optimized filtered posts hook - fetches only relevant data for the active tab
  const { 
    posts, 
    isLoading, 
    error, 
    refresh: refreshPosts,
  } = useFilteredPosts(activeTab, { enabled: isAuthenticated });
  
  // Fetch comments separately (lightweight query)
  const { data: commentsData } = db.useQuery(isAuthenticated ? { 
    comments: {}
  } : null);
  
  const allComments = useMemo(() => {
    try {
      return commentsData?.comments || [];
    } catch (e) {
      console.warn('FeedScreen: Error reading comments', e);
      return [];
    }
  }, [commentsData?.comments]);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  // Create comment counts map
  const postCommentCounts = useMemo(() => {
    const counts = {};
    allComments.forEach(comment => {
      counts[comment.postId] = (counts[comment.postId] || 0) + 1;
    });
    return counts;
  }, [allComments]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return t('feed.daysAgo', { count: days });
    if (hours > 0) return t('feed.hoursAgo', { count: hours });
    return t('feed.justNow');
  };

  const handleLike = useCallback(async (post) => {
    if (!user) {
      alert(t('auth.loginRequired'), t('auth.pleaseLogin'));
      return;
    }

    const currentLikedBy = post.likedBy || [];
    const isLiked = currentLikedBy.includes(user.id);
    
    try {
      if (isLiked) {
        await db.transact(
          db.tx.posts[post.id].update({
            likedBy: currentLikedBy.filter(id => id !== user.id),
            likes: Math.max(0, (post.likes || 0) - 1)
          })
        );
      } else {
        await db.transact(
          db.tx.posts[post.id].update({
            likedBy: [...currentLikedBy, user.id],
            likes: (post.likes || 0) + 1
          })
        );
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Like error:', err);
      alert(t('common.error'), t('errors.tryAgain'));
    }
  }, [user, t, alert]);

  const handleShare = useCallback(async (post) => {
    try {
      await Share.share({
        message: `${t('post.helpNeeded')}: ${post.title || t('post.helpNeeded')}\n\n${post.description}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh the posts cache
    refreshPosts();
    // InstantDB auto-refreshes, but we simulate a delay for UX
    setTimeout(() => {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }, 1000);
  }, [refreshPosts]);

  const tabs = [
    { key: 'nearby', label: t('feed.nearby') },
    { key: 'friends', label: t('feed.friends') },
    { key: 'myPosts', label: t('feed.myPosts') },
    { key: 'myClaims', label: t('feed.myClaims') },
  ];

  const renderPostCard = (post) => {
    const isMyPost = post.authorId === user?.id;
    const likedBy = post.likedBy || [];
    const isLiked = user && likedBy.includes(user.id);
    const likeCount = likedBy.length || post.likes || 0;
    const commentCount = postCommentCounts[post.id] || post.comments || 0;
    const claimers = post.claimers || [];
    const isApproved = post.approvedClaimerId;
    const isClaimedByMe = post.approvedClaimerId === user?.id;

    return (
      <TouchableOpacity 
        key={post.id}
        style={[
          styles.postCard, 
          { 
            backgroundColor: themeColors.surface,
            borderColor: isApproved ? colors.success : themeColors.border,
          }
        ]}
        onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={[styles.postHeader, { flexDirection: rtlStyles.row }]}>
          <OptimizedAvatar 
            source={post.avatar}
            fallbackId={post.authorId}
            size={44}
            style={isRTL ? { marginLeft: spacing.md, marginRight: 0 } : { marginRight: spacing.md }}
          />
          <View style={[styles.headerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.authorName, { color: themeColors.text }]}>
              {isMyPost ? (user?.name || post.author) : post.author}
            </Text>
            <View style={[styles.metaRow, { flexDirection: rtlStyles.row }]}>
              <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                🕐 {formatTime(post.timestamp || post.createdAt)}
              </Text>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{post.tag || post.category || t('post.categories.other')}</Text>
              </View>
            </View>
          </View>
          {isApproved && (
            <View style={[styles.statusBadge, { backgroundColor: isClaimedByMe ? '#D1FAE5' : '#F3F4F6' }]}>
              <Text style={[styles.statusText, { color: isClaimedByMe ? '#059669' : themeColors.textSecondary }]}>
                ✓ {isClaimedByMe ? t('feed.claimed') : t('feed.approved')}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <Text style={[styles.postTitle, { color: themeColors.text, textAlign: rtlStyles.textAlign }]} numberOfLines={2}>
          {post.title || t('post.helpNeeded')}
        </Text>
        <Text style={[styles.postDescription, { color: themeColors.textSecondary, textAlign: rtlStyles.textAlign }]} numberOfLines={3}>
          {post.description}
        </Text>

        {/* Photos - Show photo count indicator if post has photos */}
        {post.photosCount > 0 && (
          <View style={styles.photosIndicator}>
            <Text style={styles.photosIndicatorText}>📷 {post.photosCount} {post.photosCount === 1 ? 'photo' : 'photos'}</Text>
          </View>
        )}

        {/* Location */}
        {post.location && (
          <View style={[styles.locationRow, { flexDirection: rtlStyles.row, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={[styles.locationText, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {post.location}
            </Text>
          </View>
        )}

        {/* Claimers - Show count from stripped data */}
        {(post.claimersCount > 0 || claimers.length > 0) && !isApproved && (
          <View style={[styles.claimersRow, { flexDirection: rtlStyles.row }]}>
            <View style={styles.claimersIconContainer}>
              <Text style={styles.claimersIcon}>👥</Text>
            </View>
            <Text style={[styles.claimersText, { color: themeColors.textSecondary }]}>
              {post.claimersCount || claimers.length} {(post.claimersCount || claimers.length) === 1 ? t('feed.claimer') : t('feed.claimers')}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actionsRow, { borderTopColor: themeColors.border, flexDirection: rtlStyles.row }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { flexDirection: rtlStyles.row }]}
            onPress={() => handleLike(post)}
          >
            <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.actionText, { color: isLiked ? colors.primary : themeColors.textSecondary }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { flexDirection: rtlStyles.row }]}
            onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>
              {commentCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { flexDirection: rtlStyles.row }]}
            onPress={() => handleShare(post)}
          >
            <Text style={[styles.actionIcon, isRTL && { transform: [{ scaleX: -1 }] }]}>↗️</Text>
          </TouchableOpacity>

          {!isApproved && !isMyPost && (
            <TouchableOpacity 
              style={[styles.claimButton, isRTL && { marginLeft: 0, marginRight: 'auto' }]}
              onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
            >
              <Text style={styles.claimButtonText}>{t('feed.claimTask')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('feed.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {t('feed.subtitle')}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="settings" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={[styles.tabs, isRTL && { flexDirection: 'row-reverse' }]}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primary : themeColors.textSecondary },
                activeTab === tab.key && styles.activeTabText,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Posts List - Using FlatList for better memory management */}
        {isLoading ? (
        <View style={[styles.postsContainer, styles.centerContent]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              {t('feed.loadingPosts')}
            </Text>
          </View>
        ) : error ? (
        <View style={[styles.postsContainer, styles.centerContent]}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t('feed.errorLoading')}
            </Text>
            <Text style={[styles.errorDetail, { color: themeColors.textSecondary }]}>
              {error.message}
            </Text>
          </View>
        ) : posts.length === 0 ? (
        <View style={[styles.postsContainer, styles.centerContent]}>
            <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            {activeTab === 'myPosts' ? t('feed.noMyPosts') : 
             activeTab === 'myClaims' ? t('feed.noMyClaims') : 
             t('feed.noPosts')}
            </Text>
            {activeTab === 'myPosts' && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('Create')}
              >
                <Text style={styles.createButtonText}>{t('feed.createFirstPost')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderPostCard(item)}
          contentContainerStyle={styles.postsContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
          // Memory optimization settings
          initialNumToRender={INITIAL_RENDER_COUNT}
          maxToRenderPerBatch={MAX_RENDER_PER_BATCH}
          windowSize={5}
          removeClippedSubviews={true}
          // Prevent re-renders
          getItemLayout={(data, index) => ({
            length: 350, // Approximate item height
            offset: 350 * index,
            index,
          })}
        />
      )}
    </View>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(FeedScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  filterButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  tabsContainer: {
    borderBottomWidth: 1,
  },
  tabs: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  postsContainer: {
    flex: 1,
  },
  postsContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorText: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: '600',
  },
  errorDetail: {
    marginTop: spacing.sm,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: 16,
    textAlign: 'center',
  },
  createButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 12,
  },
  tagBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  postDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  photosIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  photosIndicatorText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  locationRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 13,
    maxWidth: 200,
  },
  claimersRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  claimersIconContainer: {
    backgroundColor: '#F0F9FF',
    padding: spacing.xs,
    borderRadius: 8,
  },
  claimersIcon: {
    fontSize: 16,
  },
  claimersText: {
    fontSize: 13,
  },
  actionsRow: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  claimButton: {
    marginLeft: 'auto',
    backgroundColor: '#1F2937',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
