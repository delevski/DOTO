import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import { sendPushNotificationToUser } from '../utils/pushNotifications';

export default function PostDetailsScreen({ route, navigation }) {
  const { postId } = route.params;
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  
  const [newComment, setNewComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  // Fetch post and comments from InstantDB
  const { isLoading, error, data } = db.useQuery({ 
    posts: { $: { where: { id: postId } } },
    comments: { $: { where: { postId: postId } } }
  });
  
  const post = data?.posts?.[0];
  const comments = (data?.comments || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

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

  const claimers = post.claimers || [];
  const approvedClaimerId = post.approvedClaimerId;
  const isMyPost = post.authorId === user?.id;
  const isClaimedByMe = approvedClaimerId === user?.id;
  const hasClaimed = user && claimers.some(c => c.userId === user.id);
  const likedBy = post.likedBy || [];
  const isLiked = user && likedBy.includes(user.id);
  const likeCount = likedBy.length || post.likes || 0;
  const completedByClaimer = post.completedByClaimer || false;
  const completedByAuthor = post.completedByAuthor || false;
  const isCompleted = post.isCompleted || false;

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

  const handleClaim = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to claim tasks');
      return;
    }

    if (isMyPost) {
      Alert.alert('Error', 'You cannot claim your own post');
      return;
    }

    if (hasClaimed) {
      Alert.alert('Already Claimed', 'You have already claimed this task');
      return;
    }

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
          postTitle: post.title || 'Help Needed',
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
      
      Alert.alert('Success', 'Task claimed! The poster will review your claim.');
    } catch (err) {
      console.error('Claim error:', err);
      Alert.alert('Error', 'Failed to claim task');
    }
  };

  const handleApproveClaimer = async (claimerUserId) => {
    try {
      const claimer = claimers.find(c => c.userId === claimerUserId);
      if (!claimer) return;

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
          postTitle: post.title || 'Help Needed',
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
      
      Alert.alert('Success', `${claimer.userName} has been approved!`);
    } catch (err) {
      console.error('Approve error:', err);
      Alert.alert('Error', 'Failed to approve claimer');
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like posts');
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
  };

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to comment');
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
      setNewComment('');
    } catch (err) {
      console.error('Comment error:', err);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleMarkComplete = async () => {
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
          postTitle: post.title || 'Help Needed',
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
      
      Alert.alert('Success', 'Task marked as complete! Waiting for poster confirmation.');
    } catch (err) {
      console.error('Complete error:', err);
      Alert.alert('Error', 'Failed to mark as complete');
    }
  };

  const handleConfirmAndRate = async () => {
    if (selectedRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }

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
          postTitle: post.title || 'Help Needed',
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
      
      setShowRatingModal(false);
      Alert.alert('Success', 'Task completed and helper rated!');
    } catch (err) {
      console.error('Rate error:', err);
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Post Card */}
        <View style={[styles.postCard, { backgroundColor: themeColors.surface }]}>
          {/* Author Header */}
          <View style={styles.authorRow}>
            <Image 
              source={{ uri: post.avatar || `https://i.pravatar.cc/150?u=${post.authorId}` }}
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
                <Image 
                  key={index}
                  source={{ uri: typeof photo === 'string' ? photo : photo.preview }}
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
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>↗️</Text>
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>Share</Text>
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
                        <Image 
                          source={{ uri: claimer.userAvatar }}
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
              <Image source={{ uri: user.avatar }} style={styles.commentAvatar} />
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
                <Image 
                  source={{ uri: comment.avatar || `https://i.pravatar.cc/150?u=${comment.authorId}` }}
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
