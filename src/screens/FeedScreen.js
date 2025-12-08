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
  Dimensions,
} from 'react-native';
import PagerView from 'react-native-pager-view';
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
import NotificationBadge from '../components/NotificationBadge';
import { sendPushNotificationToUser } from '../utils/pushNotifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const pagerRef = useRef(null);

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
    hasSocialConnection,
    socialFriendsCount,
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
    const alreadyLiked = currentLikedBy.includes(user.id);
    
    try {
      if (alreadyLiked) {
        // Unlike: Remove user from likedBy array
        const newLikedBy = currentLikedBy.filter(id => id !== user.id);
        await db.transact(
          db.tx.posts[post.id].update({
            likedBy: newLikedBy,
            likes: newLikedBy.length
          })
        );
      } else {
        // Like: Add user to likedBy array (ensure no duplicates using Set)
        const newLikedBy = [...new Set([...currentLikedBy, user.id])];
        await db.transact(
          db.tx.posts[post.id].update({
            likedBy: newLikedBy,
            likes: newLikedBy.length
          })
        );
        
        // Send push notification to post author (only when liking, not unliking)
        // Don't notify if user is liking their own post
        if (post.authorId && post.authorId !== user.id) {
          await sendPushNotificationToUser(
            post.authorId,
            'postLiked',
            { userName: user.name, postTitle: post.title || 'your post' },
            { postId: post.id, type: 'post_liked' }
          );
        }
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

  const tabs = useMemo(() => [
    { key: 'nearby', label: t('feed.nearby') },
    { key: 'friends', label: t('feed.friends') },
    { key: 'myPosts', label: t('feed.myPosts') },
    { key: 'myClaims', label: t('feed.myClaims') },
  ], [t]);

  const handleTabPress = useCallback((tabKey, index) => {
    setActiveTab(tabKey);
    pagerRef.current?.setPage(index);
  }, []);

  const handlePageSelected = useCallback((e) => {
    const pageIndex = e.nativeEvent.position;
    setActiveTab(tabs[pageIndex].key);
  }, [tabs]);

  const renderPostCard = (post) => {
    const isMyPost = post.authorId === user?.id;
    const likedBy = post.likedBy || [];
    // Use isLikedByMe flag if available, otherwise check likedBy array
    const isLiked = post.isLikedByMe ?? (user && likedBy.includes(user.id));
    const likeCount = post.likesCount ?? likedBy.length ?? post.likes ?? 0;
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
              <View style={styles.metaTimeRow}>
                <Icon name="time-outline" size={12} color={themeColors.textSecondary} />
                <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                  {formatTime(post.timestamp || post.createdAt)}
                </Text>
              </View>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{post.tag || post.category || t('post.categories.other')}</Text>
              </View>
            </View>
          </View>
          {isApproved && (
            <View style={[styles.statusBadge, { backgroundColor: isClaimedByMe ? '#D1FAE5' : '#F3F4F6', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Icon name="checkmark" size={12} color={isClaimedByMe ? '#059669' : themeColors.textSecondary} />
              <Text style={[styles.statusText, { color: isClaimedByMe ? '#059669' : themeColors.textSecondary }]}>
                {isClaimedByMe ? t('feed.claimed') : t('feed.approved')}
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
          <View style={[styles.photosIndicator, { flexDirection: rtlStyles.row }]}>
            <Icon name="camera-outline" size={14} color="#6B7280" />
            <Text style={styles.photosIndicatorText}>{post.photosCount} {post.photosCount === 1 ? t('feed.photo') : t('feed.photos')}</Text>
          </View>
        )}

        {/* Location */}
        {post.location && (
          <View style={[styles.locationRow, { flexDirection: rtlStyles.row, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Icon name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.locationText, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {post.location}
            </Text>
          </View>
        )}

        {/* Claimers - Show count from stripped data */}
        {(post.claimersCount > 0 || claimers.length > 0) && !isApproved && (
          <View style={[styles.claimersRow, { flexDirection: rtlStyles.row }]}>
            <View style={styles.claimersIconContainer}>
              <Icon name="people-outline" size={16} color={colors.primary} />
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
            <Icon name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? colors.primary : themeColors.textSecondary} />
            <Text style={[styles.actionText, { color: isLiked ? colors.primary : themeColors.textSecondary }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { flexDirection: rtlStyles.row }]}
            onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
          >
            <Icon name="chatbubble-outline" size={20} color={themeColors.textSecondary} />
            <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>
              {commentCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { flexDirection: rtlStyles.row }]}
            onPress={() => handleShare(post)}
          >
            <Icon name="share-outline" size={20} color={themeColors.textSecondary} style={isRTL ? { transform: [{ scaleX: -1 }] } : null} />
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
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('feed.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {t('feed.subtitle')}
          </Text>
        </View>
        <View style={[styles.headerButtons, { flexDirection: rtlStyles.row }]}>
          <NotificationBadge />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={[styles.tabs, isRTL && { flexDirection: 'row-reverse' }]}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => handleTabPress(tab.key, index)}
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

      {/* Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        {/* Page 0: Nearby */}
        <View key="nearby" style={styles.pageContainer}>
          {activeTab === 'nearby' && (
            isLoading ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                  {t('feed.loadingPosts')}
                </Text>
              </View>
            ) : error ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <Icon name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {t('feed.errorLoading')}
                </Text>
                <Text style={[styles.errorDetail, { color: themeColors.textSecondary }]}>
                  {error.message}
                </Text>
              </View>
            ) : posts.length === 0 ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <Icon name="clipboard-outline" size={64} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  {t('feed.noPosts')}
                </Text>
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
                initialNumToRender={INITIAL_RENDER_COUNT}
                maxToRenderPerBatch={MAX_RENDER_PER_BATCH}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 350,
                  offset: 350 * index,
                  index,
                })}
              />
            )
          )}
        </View>

        {/* Page 1: Friends Feed */}
        <View key="friends" style={styles.pageContainer}>
          {activeTab === 'friends' && (
            isLoading ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                  {t('feed.loadingPosts')}
                </Text>
              </View>
            ) : error ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <Icon name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {t('feed.errorLoading')}
                </Text>
                <Text style={[styles.errorDetail, { color: themeColors.textSecondary }]}>
                  {error.message}
                </Text>
              </View>
            ) : !hasSocialConnection ? (
              // User hasn't connected any social account
              <View style={[styles.postsContainer, styles.centerContent]}>
                <View style={styles.connectSocialContainer}>
                  <Icon name="people-outline" size={64} color={colors.primary} />
                  <Text style={[styles.connectSocialTitle, { color: themeColors.text }]}>
                    {t('feed.connectToSeeFriends') || 'Connect to See Friends'}
                  </Text>
                  <Text style={[styles.connectSocialText, { color: themeColors.textSecondary }]}>
                    {t('feed.connectSocialDescription') || 'Connect your Google or Facebook account to see posts from your friends who are also on DOTO.'}
                  </Text>
                  <View style={styles.socialConnectButtons}>
                    <TouchableOpacity 
                      style={styles.googleConnectButton}
                      onPress={() => navigation.navigate('Settings')}
                    >
                      <Icon name="logo-google" size={20} color="#fff" />
                      <Text style={styles.connectButtonText}>
                        {t('auth.connectGoogle') || 'Connect Google'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.facebookConnectButton}
                      onPress={() => navigation.navigate('Settings')}
                    >
                      <Icon name="logo-facebook" size={20} color="#fff" />
                      <Text style={styles.connectButtonText}>
                        {t('auth.connectFacebook') || 'Connect Facebook'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : posts.length === 0 ? (
              // User connected but no friends on DOTO yet
              <View style={[styles.postsContainer, styles.centerContent]}>
                <View style={styles.noFriendsContainer}>
                  <Icon name="people-outline" size={64} color={themeColors.textSecondary} />
                  <Text style={[styles.noFriendsTitle, { color: themeColors.text }]}>
                    {t('feed.noFriendsYet') || 'No Friends on DOTO Yet'}
                  </Text>
                  <Text style={[styles.noFriendsText, { color: themeColors.textSecondary }]}>
                    {socialFriendsCount > 0 
                      ? t('feed.friendsNotPosted', { count: socialFriendsCount })
                      : t('feed.inviteFriends')}
                  </Text>
                  <TouchableOpacity 
                    style={styles.inviteButton}
                    onPress={() => {
                      Share.share({
                        message: t('feed.inviteMessage') || 'Join me on DOTO - the app for neighbors helping neighbors! Download it now.',
                      });
                    }}
                  >
                    <Icon name="share-social-outline" size={18} color="#fff" />
                    <Text style={styles.inviteButtonText}>
                      {t('feed.inviteFriendsButton') || 'Invite Friends'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Show friends' posts
              <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderPostCard(item)}
                contentContainerStyle={styles.postsContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                showsVerticalScrollIndicator={false}
                initialNumToRender={INITIAL_RENDER_COUNT}
                maxToRenderPerBatch={MAX_RENDER_PER_BATCH}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 350,
                  offset: 350 * index,
                  index,
                })}
              />
            )
          )}
        </View>

        {/* Page 2: My Posts */}
        <View key="myPosts" style={styles.pageContainer}>
          {activeTab === 'myPosts' && (
            isLoading ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                  {t('feed.loadingPosts')}
                </Text>
              </View>
            ) : error ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <Icon name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {t('feed.errorLoading')}
                </Text>
                <Text style={[styles.errorDetail, { color: themeColors.textSecondary }]}>
                  {error.message}
                </Text>
              </View>
            ) : posts.length === 0 ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <Icon name="clipboard-outline" size={64} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  {t('feed.noMyPosts')}
                </Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => navigation.navigate('Create')}
                >
                  <Text style={styles.createButtonText}>{t('feed.createFirstPost')}</Text>
                </TouchableOpacity>
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
                initialNumToRender={INITIAL_RENDER_COUNT}
                maxToRenderPerBatch={MAX_RENDER_PER_BATCH}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 350,
                  offset: 350 * index,
                  index,
                })}
              />
            )
          )}
        </View>

        {/* Page 3: My Claims */}
        <View key="myClaims" style={styles.pageContainer}>
          {activeTab === 'myClaims' && (
            isLoading ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                  {t('feed.loadingPosts')}
                </Text>
              </View>
            ) : error ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <Icon name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {t('feed.errorLoading')}
                </Text>
                <Text style={[styles.errorDetail, { color: themeColors.textSecondary }]}>
                  {error.message}
                </Text>
              </View>
            ) : posts.length === 0 ? (
              <View style={[styles.postsContainer, styles.centerContent]}>
                <Icon name="clipboard-outline" size={64} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  {t('feed.noMyClaims')}
                </Text>
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
                initialNumToRender={INITIAL_RENDER_COUNT}
                maxToRenderPerBatch={MAX_RENDER_PER_BATCH}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 350,
                  offset: 350 * index,
                  index,
                })}
              />
            )
          )}
        </View>
      </PagerView>
    </View>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(FeedScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  errorText: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: '600',
  },
  errorDetail: {
    marginTop: spacing.sm,
    fontSize: 14,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: 16,
    textAlign: 'center',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    gap: spacing.sm,
  },
  comingSoonBadgeText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  // Friends Feed Styles - Connect Social
  connectSocialContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  connectSocialTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  connectSocialText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  socialConnectButtons: {
    flexDirection: 'column',
    gap: spacing.md,
    width: '100%',
    maxWidth: 280,
  },
  googleConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DB4437',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  facebookConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4267B2',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Friends Feed Styles - No Friends
  noFriendsContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  noFriendsTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  noFriendsText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  metaTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    alignItems: 'center',
    gap: spacing.xs,
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
