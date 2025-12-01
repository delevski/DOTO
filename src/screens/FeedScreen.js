import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db } from '../lib/instant';
import { useAuth } from '../context/AuthContext';
import { t } from '../utils/translations';

const TABS = ['nearby', 'myPosts', 'myClaim'];

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('nearby');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch posts and comments from InstantDB
  const { isLoading, error, data } = db.useQuery({ 
    posts: {},
    comments: {}
  });

  const allPosts = data?.posts || [];
  const allComments = data?.comments || [];

  // Create comment count map
  const commentCounts = allComments.reduce((acc, comment) => {
    acc[comment.postId] = (acc[comment.postId] || 0) + 1;
    return acc;
  }, {});

  // Filter posts based on active tab
  const getFilteredPosts = () => {
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
        // Show all posts except completed (approved) ones
        filtered = filtered.filter(post => !post.approvedClaimerId);
        break;
    }

    // Sort by newest first
    return filtered.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
  };

  const posts = getFilteredPosts();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // InstantDB auto-refreshes, just simulate delay
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const handleLike = (post) => {
    if (!user) return;

    const currentLikedBy = post.likedBy || [];
    const isLiked = currentLikedBy.includes(user.id);

    if (isLiked) {
      db.transact(
        db.tx.posts[post.id].update({
          likedBy: currentLikedBy.filter(id => id !== user.id),
          likes: Math.max(0, (post.likes || 0) - 1)
        })
      );
    } else {
      db.transact(
        db.tx.posts[post.id].update({
          likedBy: [...currentLikedBy, user.id],
          likes: (post.likes || 0) + 1
        })
      );
    }
  };

  const renderPostCard = ({ item: post }) => {
    const likedBy = post.likedBy || [];
    const isLiked = user && likedBy.includes(user.id);
    const likeCount = likedBy.length || post.likes || 0;
    const commentsCount = commentCounts[post.id] || post.comments || 0;
    const claimersCount = (post.claimers || []).length;
    const isMyPost = post.authorId === user?.id;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
        activeOpacity={0.7}
      >
        {/* Author Header */}
        <View style={styles.postHeader}>
          <Image 
            source={{ uri: post.avatar || 'https://i.pravatar.cc/150' }} 
            style={styles.authorAvatar} 
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author}</Text>
            <View style={styles.postMeta}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.postTime}>{formatTime(post.timestamp)}</Text>
              {post.tag && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{post.tag}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
          {isMyPost && (
            <View style={styles.myPostBadge}>
              <Text style={styles.myPostBadgeText}>Your Post</Text>
            </View>
          )}
        </View>

        {/* Post Content */}
        <View style={styles.postContent}>
          {post.title && (
            <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
          )}
          <Text style={styles.postDescription} numberOfLines={3}>
            {post.description}
          </Text>
        </View>

        {/* Post Image */}
        {post.photos && post.photos.length > 0 && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: post.photos[0] }} 
              style={styles.postImage}
              resizeMode="cover"
            />
            {post.photos.length > 1 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>+{post.photos.length - 1}</Text>
              </View>
            )}
          </View>
        )}

        {/* Location */}
        {post.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{post.location}</Text>
          </View>
        )}

        {/* Claimers */}
        {claimersCount > 0 && !post.approvedClaimerId && (
          <View style={styles.claimersRow}>
            <View style={styles.claimersAvatars}>
              {post.claimers.slice(0, 3).map((claimer, index) => (
                <Image
                  key={claimer.userId}
                  source={{ uri: claimer.userAvatar || 'https://i.pravatar.cc/150' }}
                  style={[styles.claimerAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                />
              ))}
            </View>
            <Text style={styles.claimersText}>
              {claimersCount} {claimersCount === 1 ? 'claimer' : 'claimers'}
            </Text>
          </View>
        )}

        {/* Actions Footer */}
        <View style={styles.postFooter}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleLike(post)}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={isLiked ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                {likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionText}>{commentsCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!isMyPost && !post.approvedClaimerId && (
            <TouchableOpacity 
              style={styles.claimButton}
              onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
            >
              <Text style={styles.claimButtonText}>{t('claimTask')}</Text>
            </TouchableOpacity>
          )}

          {post.approvedClaimerId && (
            <View style={styles.approvedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.approvedText}>
                {post.approvedClaimerId === user?.id ? t('claimedByYou') : 'Claimed'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.border} />
      <Text style={styles.emptyTitle}>{t('noPostsYet')}</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'myPosts' 
          ? 'Create your first post to help your community!'
          : activeTab === 'myClaim'
          ? "You haven't been approved for any tasks yet."
          : 'Be the first to post a task!'}
      </Text>
      {activeTab === 'myPosts' && (
        <TouchableOpacity 
          style={styles.createPostButton}
          onPress={() => navigation.navigate('PostCreate')}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createPostGradient}
          >
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.createPostText}>Create Post</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading posts</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{t('feed')}</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => {/* TODO: Open filters */}}
        >
          <Ionicons name="filter-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading && renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : null
        }
      />

      {/* FAB - Create Post */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('PostCreate')}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  screenTitle: {
    ...typography.h1,
    color: colors.text,
  },
  filterButton: {
    padding: spacing.sm,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  postTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  metaDot: {
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  tagBadge: {
    backgroundColor: colors.tagBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption,
    color: colors.tagText,
    fontWeight: '600',
  },
  myPostBadge: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  myPostBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  postContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  postTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  postDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.inputBg,
  },
  moreImagesOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  moreImagesText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  locationText: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  claimersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  claimersAvatars: {
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  claimerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.card,
  },
  claimersText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  actionTextActive: {
    color: colors.primary,
  },
  claimButton: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  claimButtonText: {
    ...typography.smallMedium,
    color: colors.white,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  approvedText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  createPostButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  createPostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  createPostText: {
    ...typography.bodySemibold,
    color: colors.white,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    ...typography.bodySemibold,
    color: colors.white,
  },
  loader: {
    paddingVertical: spacing.lg,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.lg,
  },
  fabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

