import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Share,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import { sendPushNotificationToUser } from '../utils/pushNotifications';
import OptimizedImage, { OptimizedAvatar, OptimizedPostImage } from '../components/OptimizedImage';

function PostDetailsScreen({ route, navigation }) {
  const { postId } = route.params || {};
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  const { alert } = useDialog();
  
  const [newComment, setNewComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track mounted state for cleanup
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Only query when we have a valid postId and authenticated
  const shouldQuery = isAuthenticated && postId;

  // Fetch post and comments from InstantDB
  const { isLoading, error, data } = db.useQuery(shouldQuery ? { 
    posts: { $: { where: { id: postId } } },
    comments: { $: { where: { postId: postId } } }
  } : null);
  
  // Safely extract data
  const post = useMemo(() => {
    try {
      return data?.posts?.[0] || null;
    } catch (e) {
      return null;
    }
  }, [data?.posts]);
  
  const comments = useMemo(() => {
    try {
      return (data?.comments || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
      return [];
    }
  }, [data?.comments]);

  const themeColors = useMemo(() => ({
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  }), [darkMode]);

  // Derive values from post (use defaults when post is null during loading)
  const claimers = post?.claimers || [];
  const approvedClaimerId = post?.approvedClaimerId;
  const isMyPost = post?.authorId === user?.id;
  const isClaimedByMe = approvedClaimerId === user?.id;
  const hasClaimed = user && claimers.some(c => c.userId === user.id);
  const likedBy = post?.likedBy || [];
  const isLiked = user && likedBy.includes(user.id);
  const likeCount = likedBy.length || post?.likes || 0;
  const completedByClaimer = post?.completedByClaimer || false;
  const completedByAuthor = post?.completedByAuthor || false;
  const isCompleted = post?.isCompleted || false;

  // All useCallback hooks MUST be called before any early returns
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return t('feed.daysAgo', { count: days }) || `${days}d ago`;
    if (hours > 0) return t('feed.hoursAgo', { count: hours }) || `${hours}h ago`;
    return t('feed.justNow') || 'Just now';
  }, [t]);

  // Helper to update user's activity streak
  // Update user's last activity date - streak is calculated in useUserStats
  const updateUserStreak = useCallback(async (userId) => {
    if (!userId || !isMountedRef.current) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Just update the last activity date
      // The useUserStats hook will calculate streaks from the activity history
      await db.transact(
        db.tx.users[userId].update({
          lastActivityDate: today,
        })
      );
    } catch (err) {
      console.error('Error updating activity:', err);
    }
  }, []);

  const handleClaim = useCallback(async () => {
    if (!user) {
      alert(t('auth.loginRequired'), t('auth.pleaseLogin'));
      return;
    }

    if (isMyPost) {
      alert(t('common.error'), t('postDetails.cannotClaimOwn'));
      return;
    }

    if (hasClaimed) {
      alert(t('postDetails.alreadyClaimed'), t('postDetails.alreadyClaimedDesc'));
      return;
    }

    setIsSubmitting(true);

    try {
      const now = Date.now();
      const newClaimer = {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
        claimedAt: now
      };

      await db.transact(
        db.tx.posts[postId].update({
          claimers: [...claimers, newClaimer]
        })
      );
      
      // Create in-app notification for the poster
      const notificationId = id();
      await db.transact(
        db.tx.notifications[notificationId].update({
          id: notificationId,
          userId: post.authorId,
          postId: postId,
          type: 'post_claimed',
          message: `${user.name} wants to help with your task!`,
          read: false,
          timestamp: now,
          postTitle: post.title || t('post.helpNeeded') || 'Help Needed',
          createdAt: now
        })
      );
      
      // Send push notification to the poster (in their preferred language)
      sendPushNotificationToUser(
        post.authorId,
        'newClaim',
        { userName: user.name, postTitle: post.title || 'your task' },
        { postId, type: 'post_claimed' }
      );
      
      // Update user's activity streak
      updateUserStreak(user.id);
      
      if (isMountedRef.current) {
        alert(t('common.success'), t('postDetails.claimSuccess'));
      }
    } catch (err) {
      console.error('Claim error:', err);
      if (isMountedRef.current) {
        alert(t('common.error'), t('errors.failedToClaimTask'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [user, isMyPost, hasClaimed, postId, claimers, post, t, updateUserStreak]);

  const handleApproveClaimer = useCallback(async (claimerUserId) => {
      const claimer = claimers.find(c => c.userId === claimerUserId);
      if (!claimer) return;

    setIsSubmitting(true);
    
    try {
      const now = Date.now();

      await db.transact(
        db.tx.posts[postId].update({
          approvedClaimerId: claimerUserId,
          approvedClaimerName: claimer.userName,
          approvedClaimerAvatar: claimer.userAvatar,
          approvedAt: now
        })
      );
      
      // Create in-app notification for the approved claimer
      const notificationId = id();
      await db.transact(
        db.tx.notifications[notificationId].update({
          id: notificationId,
          userId: claimerUserId,
          postId: postId,
          type: 'claimer_approved',
          message: `You were approved to help with "${post.title || 'a task'}"!`,
          read: false,
          timestamp: now,
          postTitle: post.title || t('post.helpNeeded') || 'Help Needed',
          createdAt: now
        })
      );
      
      // Send push notification to the approved claimer (in their preferred language)
      sendPushNotificationToUser(
        claimerUserId,
        'claimerApproved',
        { postTitle: post.title || 'a task' },
        { postId, type: 'claimer_approved' }
      );
      
      if (isMountedRef.current) {
        alert(t('common.success'), `${claimer.userName} ${t('postDetails.hasBeenApproved')}`);
      }
    } catch (err) {
      console.error('Approve error:', err);
      if (isMountedRef.current) {
        alert(t('common.error'), t('errors.failedToApprove'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [claimers, postId, post, t]);

  const handleLike = useCallback(async () => {
    if (!user) {
      alert(t('auth.loginRequired'), t('auth.pleaseLogin'));
      return;
    }

    try {
      if (isLiked) {
        await db.transact(
          db.tx.posts[postId].update({
            likedBy: likedBy.filter(uid => uid !== user.id),
            likes: Math.max(0, (post.likes || 0) - 1)
          })
        );
      } else {
        await db.transact(
          db.tx.posts[postId].update({
            likedBy: [...likedBy, user.id],
            likes: (post.likes || 0) + 1
          })
        );
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  }, [user, isLiked, postId, likedBy, post, t]);

  const handleAddComment = useCallback(async () => {
    if (!user) {
      alert(t('auth.loginRequired'), t('auth.pleaseLogin'));
      return;
    }

    if (!newComment.trim()) return;

    try {
      const commentId = id();
      await db.transact(
        db.tx.comments[commentId].update({
          id: commentId,
          postId: postId,
          authorId: user.id,
          author: user.name,
          avatar: user.avatar,
          text: newComment.trim(),
          timestamp: Date.now(),
        }),
        db.tx.posts[postId].update({
          comments: (post.comments || 0) + 1
        })
      );
      if (isMountedRef.current) {
      setNewComment('');
      }
      
      // Update user's activity streak
      updateUserStreak(user.id);
    } catch (err) {
      console.error('Comment error:', err);
      if (isMountedRef.current) {
        alert(t('common.error'), t('errors.failedToAddComment'));
      }
    }
  }, [user, newComment, postId, post, t, updateUserStreak, alert]);

  const handleMarkComplete = useCallback(async () => {
    if (!isClaimedByMe) {
      alert(t('common.error'), t('postDetails.onlyClaimerCanComplete'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const now = Date.now();
      
      await db.transact(
        db.tx.posts[postId].update({
          completedByClaimer: true
        })
      );
      
      // Create in-app notification for the poster
      const notificationId = id();
      await db.transact(
        db.tx.notifications[notificationId].update({
          id: notificationId,
          userId: post.authorId,
          postId: postId,
          type: 'task_marked_complete',
          message: `The helper has marked "${post.title || 'your task'}" as complete!`,
          read: false,
          timestamp: now,
          postTitle: post.title || t('post.helpNeeded') || 'Help Needed',
          createdAt: now
        })
      );
      
      // Send push notification to the poster (in their preferred language)
      sendPushNotificationToUser(
        post.authorId,
        'taskMarkedComplete',
        { postTitle: post.title || 'your task' },
        { postId, type: 'task_marked_complete' }
      );
      
      // Update user's activity streak
      updateUserStreak(user.id);
      
      if (isMountedRef.current) {
        alert(t('common.success'), t('postDetails.markedComplete'));
      }
    } catch (err) {
      console.error('Complete error:', err);
      if (isMountedRef.current) {
        alert(t('common.error'), t('errors.failedToMarkComplete'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [isClaimedByMe, postId, post, t, user, updateUserStreak]);

  const handleConfirmAndRate = useCallback(async () => {
    if (selectedRating === 0) {
      alert(t('postDetails.ratingRequired'), t('postDetails.pleaseSelectRating'));
      return;
    }

    setIsSubmitting(true);

    try {
      const now = Date.now();
      
      await db.transact(
        db.tx.posts[postId].update({
          completedByAuthor: true,
          isCompleted: true,
          completedAt: now,
          helperRating: selectedRating
        })
      );
      
      // Create in-app notification for the helper
      const notificationId = id();
      await db.transact(
        db.tx.notifications[notificationId].update({
          id: notificationId,
          userId: approvedClaimerId,
          postId: postId,
          type: 'task_completed',
          message: `Task completed! You received a ${selectedRating}-star rating.`,
          read: false,
          timestamp: now,
          postTitle: post.title || t('post.helpNeeded') || 'Help Needed',
          rating: selectedRating,
          createdAt: now
        })
      );
      
      // Send push notification to the helper (in their preferred language)
      sendPushNotificationToUser(
        approvedClaimerId,
        'taskAccepted',
        { postTitle: post.title || 'completed', rating: selectedRating },
        { postId, type: 'task_completed', rating: selectedRating }
      );
      
      // Update user's activity streak (author confirming)
      updateUserStreak(user.id);
      
      if (isMountedRef.current) {
      setShowRatingModal(false);
        setSelectedRating(0);
        alert(t('common.success'), t('postDetails.taskCompletedRated'));
      }
    } catch (err) {
      console.error('Rate error:', err);
      if (isMountedRef.current) {
        alert(t('common.error'), t('errors.failedToCompleteTask'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [selectedRating, postId, approvedClaimerId, post, t, user, updateUserStreak]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `${t('post.helpNeeded') || 'Help Needed'}: ${post.title || t('post.helpNeeded')}\n\n${post.description}\n\nOpen in DOTO app`,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  }, [post, t]);

  // Early returns AFTER all hooks have been called
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading post...</Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: colors.error }]}>Post not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Post Card */}
        <View style={[styles.postCard, { backgroundColor: themeColors.surface }]}>
          {/* Author Header */}
          <View style={styles.authorRow}>
            <OptimizedAvatar 
              source={post.avatar}
              fallbackId={post.authorId}
              size={48}
              style={styles.authorAvatar}
            />
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: themeColors.text }]}>
                {isMyPost ? (user?.name || post.author) : post.author}
              </Text>
              <Text style={[styles.postTime, { color: themeColors.textSecondary }]}>
                {formatTime(post.timestamp || post.createdAt)}
              </Text>
            </View>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{post.tag || post.category || 'Other'}</Text>
            </View>
          </View>

          {/* Post Content */}
          <Text style={[styles.postTitle, { color: themeColors.text }]}>
            {post.title || 'Help Needed'}
          </Text>
          <Text style={[styles.postDescription, { color: themeColors.textSecondary }]}>
            {post.description}
          </Text>

          {/* Photos */}
          {post.photos && post.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {post.photos.map((photo, index) => (
                <OptimizedPostImage 
                  key={index}
                  source={typeof photo === 'string' ? photo : photo.preview}
                  style={styles.postPhoto}
                />
              ))}
            </ScrollView>
          )}

          {/* Location */}
          {post.location && (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
                {post.location}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={[styles.actionsRow, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>{comments.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionIcon}>↗️</Text>
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>{t('common.share') || 'Share'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Claim Section */}
        <View style={[styles.claimCard, { 
          backgroundColor: isCompleted ? '#059669' : approvedClaimerId ? '#4B5563' : colors.primary 
        }]}>
          {isCompleted ? (
            <>
              <Text style={styles.claimTitle}>✅ Task Completed</Text>
              <Text style={styles.claimSubtitle}>
                {isClaimedByMe ? 'Great job! You completed this task.' : 'This task has been completed.'}
              </Text>
              {post.helperRating && (
                <View style={styles.ratingDisplay}>
                  <Text style={styles.ratingLabel}>Helper Rating:</Text>
                  <Text style={styles.ratingStars}>{'⭐'.repeat(post.helperRating)}</Text>
                </View>
              )}
            </>
          ) : approvedClaimerId ? (
            <>
              <Text style={styles.claimTitle}>✓ Claimer Approved</Text>
              {isClaimedByMe ? (
                <>
                  <Text style={styles.claimSubtitle}>You are the approved helper!</Text>
                  {!completedByClaimer ? (
                    <TouchableOpacity style={styles.completeButton} onPress={handleMarkComplete}>
                      <Text style={styles.completeButtonText}>Mark as Complete</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.waitingText}>Waiting for poster to confirm...</Text>
                  )}
                </>
              ) : isMyPost ? (
                <>
                  <Text style={styles.claimSubtitle}>
                    {post.approvedClaimerName || 'Someone'} is helping
                  </Text>
                  {completedByClaimer && !completedByAuthor && (
                    <TouchableOpacity style={styles.completeButton} onPress={() => setShowRatingModal(true)}>
                      <Text style={styles.completeButtonText}>Confirm & Rate Helper</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.claimSubtitle}>
                  {post.approvedClaimerName || 'Someone'} is helping with this task
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.claimTitle}>Claim This Task</Text>
              <Text style={styles.claimSubtitle}>Help {post.author} and earn rewards!</Text>
              
              {isMyPost ? (
                claimers.length > 0 ? (
                  <View style={styles.claimersSection}>
                    <Text style={styles.claimersTitle}>Choose a Claimer ({claimers.length})</Text>
                    {claimers.map((claimer) => (
                      <View key={claimer.userId} style={styles.claimerItem}>
                        <OptimizedAvatar 
                          source={claimer.userAvatar}
                          fallbackId={claimer.userId}
                          size={40}
                          style={styles.claimerAvatar}
                        />
                        <Text style={styles.claimerName}>{claimer.userName}</Text>
                        <TouchableOpacity 
                          style={styles.approveButton}
                          onPress={() => handleApproveClaimer(claimer.userId)}
                        >
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noClaimersText}>No claimers yet. Wait for someone to claim your task.</Text>
                )
              ) : hasClaimed ? (
                <View style={styles.claimedBadge}>
                  <Text style={styles.claimedText}>✓ You've claimed this task</Text>
                  <Text style={styles.claimedSubtext}>Waiting for approval</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
                  <Text style={styles.claimButtonText}>Claim Now</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Comments Section */}
        <View style={[styles.commentsCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.commentsTitle, { color: themeColors.text }]}>
            Comments ({comments.length})
          </Text>

          {/* Add Comment */}
          {user && (
            <View style={styles.addCommentRow}>
              <OptimizedAvatar source={user.avatar} fallbackId={user.id} size={36} style={styles.commentAvatar} />
              <TextInput
                style={[styles.commentInput, { color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="Write a comment..."
                placeholderTextColor={themeColors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={handleAddComment}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleAddComment}>
                <Text style={styles.sendIcon}>📤</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <Text style={[styles.noCommentsText, { color: themeColors.textSecondary }]}>
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <OptimizedAvatar 
                  source={comment.avatar}
                  fallbackId={comment.authorId}
                  size={36}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentAuthor, { color: themeColors.text }]}>
                      {comment.author}
                    </Text>
                    <Text style={[styles.commentTime, { color: themeColors.textSecondary }]}>
                      {formatTime(comment.timestamp)}
                    </Text>
                  </View>
                  <Text style={[styles.commentText, { color: themeColors.textSecondary }]}>
                    {comment.text}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Rate the Helper</Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
              How was your experience?
            </Text>
            
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Text style={styles.starIcon}>
                    {star <= selectedRating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleConfirmAndRate}
              >
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(PostDetailsScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
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
  backButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 13,
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  postDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  photosScroll: {
    marginBottom: spacing.lg,
  },
  postPhoto: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  locationIcon: {
    fontSize: 16,
  },
  locationText: {
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  claimCard: {
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  claimTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  claimSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  claimButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  claimedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  claimedSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  noClaimersText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  claimersSection: {
    marginTop: spacing.sm,
  },
  claimersTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  claimerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  claimerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  claimerName: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  approveButton: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  approveButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '700',
  },
  waitingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ratingLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  ratingStars: {
    fontSize: 18,
  },
  commentsCard: {
    borderRadius: 16,
    padding: spacing.lg,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  sendButton: {
    padding: spacing.sm,
  },
  sendIcon: {
    fontSize: 20,
  },
  noCommentsText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: spacing.xl,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 15,
    marginBottom: spacing.xl,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  starIcon: {
    fontSize: 36,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#059669',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
