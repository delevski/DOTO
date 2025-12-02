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
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

export default function FeedScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  
  const [activeTab, setActiveTab] = useState('nearby');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch posts and comments from real InstantDB
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
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const handleLike = async (post) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like posts');
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
      console.error('Like error:', err);
      Alert.alert('Error', 'Failed to update like');
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
    // InstantDB auto-refreshes, but we simulate a delay for UX
    setTimeout(() => setRefreshing(false), 1000);
  };

  const tabs = [
    { key: 'nearby', label: 'Nearby' },
    { key: 'friends', label: 'Friends' },
    { key: 'myPosts', label: 'My Posts' },
    { key: 'myClaim', label: 'My Claims' },
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
              <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                🕐 {formatTime(post.timestamp || post.createdAt)}
              </Text>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{post.tag || post.category || 'Other'}</Text>
              </View>
            </View>
          </View>
          {isApproved && (
            <View style={[styles.statusBadge, { backgroundColor: isClaimedByMe ? '#D1FAE5' : '#F3F4F6' }]}>
              <Text style={[styles.statusText, { color: isClaimedByMe ? '#059669' : themeColors.textSecondary }]}>
                ✓ {isClaimedByMe ? 'Claimed' : 'Approved'}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <Text style={[styles.postTitle, { color: themeColors.text }]} numberOfLines={2}>
          {post.title || 'Help Needed'}
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
            <Text style={styles.locationIcon}>📍</Text>
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
            <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.actionText, { color: isLiked ? colors.primary : themeColors.textSecondary }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>
              {commentCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleShare(post)}
          >
            <Text style={styles.actionIcon}>↗️</Text>
          </TouchableOpacity>

          {!isApproved && !isMyPost && (
            <TouchableOpacity 
              style={styles.claimButton}
              onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
            >
              <Text style={styles.claimButtonText}>Claim Task</Text>
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
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Feed</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            Discover tasks nearby
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
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
              Loading posts...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.error }]}>
              Error loading posts
            </Text>
            <Text style={[styles.errorDetail, { color: themeColors.textSecondary }]}>
              {error.message}
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              {activeTab === 'myPosts' ? 'You haven\'t created any posts yet' : 
               activeTab === 'myClaim' ? 'You haven\'t claimed any tasks yet' : 
               'No posts available'}
            </Text>
            {activeTab === 'myPosts' && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('Create')}
              >
                <Text style={styles.createButtonText}>Create Your First Post</Text>
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
    backgroundColor: '#F3F4F6',
  },
  filterIcon: {
    fontSize: 20,
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
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
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
  photosContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postPhoto: {
    flex: 1,
    height: 120,
    borderRadius: 8,
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
    borderRadius: 8,
  },
  morePhotosText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 13,
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
  claimersText: {
    fontSize: 13,
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
