import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

export default function FeedScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();
  
  const [activeTab, setActiveTab] = useState('nearby');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch posts and comments from InstantDB
  const { isLoading, error, data } = db.useQuery({ 
    posts: {},
    comments: {}
  });

  const allPosts = data?.posts || [];
  const allComments = data?.comments || [];

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

  // Filter and sort posts based on active tab
  const posts = useMemo(() => {
    let filtered = [...allPosts];

    switch (activeTab) {
      case 'myPosts':
        filtered = filtered.filter(post => post.authorId === user?.id);
        break;
      case 'myClaim':
        filtered = filtered.filter(post => post.approvedClaimerId === user?.id);
        break;
      case 'nearby':
      default:
        filtered = filtered.filter(post => !post.approvedClaimerId);
        break;
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
    
    return filtered;
  }, [allPosts, activeTab, user?.id]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}${t('day')} ${t('ago')}`;
    if (hours > 0) return `${hours}${t('hr')} ${t('ago')}`;
    return t('justNow');
  };

  const handleLike = async (post) => {
    if (!user) {
      Alert.alert('Login Required', t('mustBeLoggedInToLike'));
      return;
    }

    const currentLikedBy = post.likedBy || [];
    const isLiked = currentLikedBy.includes(user.id);
    
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
  };

  const handleShare = async (post) => {
    try {
      await Share.share({
        message: `Check out this task on DOTO: ${post.title || 'Help Needed'}\n\n${post.description}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Data refreshes automatically with InstantDB
    setTimeout(() => setRefreshing(false), 1000);
  };

  const tabs = [
    { key: 'nearby', label: t('nearby') },
    { key: 'friends', label: t('friends') },
    { key: 'myPosts', label: t('myPosts') },
    { key: 'myClaim', label: t('myClaim') },
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
        <View style={styles.postHeader}>
          <Image 
            source={{ uri: post.avatar || `https://i.pravatar.cc/150?u=${post.authorId}` }}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <Text style={[styles.authorName, { color: themeColors.text }]}>
              {isMyPost ? (user?.name || post.author) : post.author}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color={themeColors.textSecondary} />
              <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                {formatTime(post.timestamp || post.createdAt)}
              </Text>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{post.tag || post.category || 'Other'}</Text>
              </View>
            </View>
          </View>
          {isApproved && (
            <View style={[styles.statusBadge, { backgroundColor: isClaimedByMe ? colors.successLight : '#F3F4F6' }]}>
              <Ionicons 
                name="checkmark-circle" 
                size={14} 
                color={isClaimedByMe ? colors.success : themeColors.textSecondary} 
              />
              <Text style={[styles.statusText, { color: isClaimedByMe ? colors.success : themeColors.textSecondary }]}>
                {isClaimedByMe ? t('claimedByYou') : t('approved')}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <Text style={[styles.postTitle, { color: themeColors.text }]} numberOfLines={2}>
          {post.title || t('helpNeeded')}
        </Text>
        <Text style={[styles.postDescription, { color: themeColors.textSecondary }]} numberOfLines={3}>
          {post.description}
        </Text>

        {/* Photos */}
        {post.photos && post.photos.length > 0 && (
          <View style={styles.photosContainer}>
            {post.photos.slice(0, 3).map((photo, index) => (
              <Image 
                key={index}
                source={{ uri: typeof photo === 'string' ? photo : photo.preview }}
                style={[
                  styles.postPhoto,
                  post.photos.length === 1 && styles.singlePhoto,
                  post.photos.length === 2 && styles.doublePhoto,
                ]}
              />
            ))}
            {post.photos.length > 3 && (
              <View style={styles.morePhotos}>
                <Text style={styles.morePhotosText}>+{post.photos.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Location */}
        {post.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.locationText, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {post.location}
            </Text>
          </View>
        )}

        {/* Claimers */}
        {claimers.length > 0 && !isApproved && (
          <View style={styles.claimersRow}>
            <View style={styles.claimerAvatars}>
              {claimers.slice(0, 4).map((claimer, index) => (
                <Image
                  key={claimer.userId}
                  source={{ uri: claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}` }}
                  style={[styles.claimerAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                />
              ))}
              {claimers.length > 4 && (
                <View style={[styles.claimerAvatar, styles.moreClaimers, { marginLeft: -8 }]}>
                  <Text style={styles.moreClaimersText}>+{claimers.length - 4}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.claimersText, { color: themeColors.textSecondary }]}>
              {claimers.length} {claimers.length === 1 ? 'claimer' : 'claimers'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actionsRow, { borderTopColor: themeColors.border }]}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(post)}
          >
            <Ionicons 
              name={isLiked ? 'heart' : 'heart-outline'} 
              size={20} 
              color={isLiked ? colors.primary : themeColors.textSecondary} 
            />
            <Text style={[styles.actionText, { color: isLiked ? colors.primary : themeColors.textSecondary }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={themeColors.textSecondary} />
            <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>
              {commentCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleShare(post)}
          >
            <Ionicons name="share-outline" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>

          {!isApproved && !isMyPost && (
            <TouchableOpacity 
              style={styles.claimButton}
              onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
            >
              <Text style={styles.claimButtonText}>{t('claimTask')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('feed')}</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {t('discoverTasks')}
          </Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={20} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
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

      {/* Posts List */}
      <ScrollView
        style={styles.postsContainer}
        contentContainerStyle={styles.postsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              {t('loadingPosts')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t('errorLoadingPosts')}
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="document-text-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              {activeTab === 'myPosts' ? t('noMyPosts') : 
               activeTab === 'myClaim' ? t('noMyClaims') : 
               t('noPostsYet')}
            </Text>
            {activeTab === 'myPosts' && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('CreatePost')}
              >
                <Text style={styles.createButtonText}>{t('createYourFirstPost')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          posts.map(renderPostCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.xxl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: typography.sm,
    marginTop: spacing.xs,
  },
  filterButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
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
    fontSize: typography.base,
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
    fontSize: typography.md,
  },
  errorText: {
    marginTop: spacing.lg,
    fontSize: typography.md,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: typography.md,
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
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: typography.md,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.xs,
  },
  tagBadge: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  tagText: {
    color: colors.primary,
    fontSize: typography.xs,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  postDescription: {
    fontSize: typography.base,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  postPhoto: {
    flex: 1,
    height: 120,
    borderRadius: borderRadius.md,
  },
  singlePhoto: {
    height: 180,
  },
  doublePhoto: {
    height: 140,
  },
  morePhotos: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '33%',
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  morePhotosText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: typography.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: typography.sm,
    maxWidth: 200,
  },
  claimersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  claimerAvatars: {
    flexDirection: 'row',
  },
  claimerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreClaimers: {
    backgroundColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreClaimersText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  claimersText: {
    fontSize: typography.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: typography.sm,
    fontWeight: '500',
  },
  claimButton: {
    marginLeft: 'auto',
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: typography.sm,
    fontWeight: '600',
  },
});
