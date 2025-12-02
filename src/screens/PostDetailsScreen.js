import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db, id } from '../lib/instant';
import { getConversationId, createOrUpdateConversation } from '../utils/messaging';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

export default function PostDetailsScreen({ route, navigation }) {
  const { postId } = route.params;
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();

  const [newComment, setNewComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Fetch post and comments
  const { isLoading, error, data } = db.useQuery({ 
    posts: { $: { where: { id: postId } } },
    comments: { $: { where: { postId: postId } } }
  });

  const post = data?.posts?.[0];
  const comments = data?.comments || [];

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContent, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Text style={{ color: themeColors.text }}>Post not found</Text>
      </View>
    );
  }

  const isMyPost = post.authorId === user?.id;
  const claimers = post.claimers || [];
  const approvedClaimerId = post.approvedClaimerId;
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
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', t('mustBeLoggedInToLike'));
      return;
    }

    const currentLikedBy = post.likedBy || [];
    const isCurrentlyLiked = currentLikedBy.includes(user.id);
    
    if (isCurrentlyLiked) {
      await db.transact(
        db.tx.posts[postId].update({
          likedBy: currentLikedBy.filter(id => id !== user.id),
          likes: Math.max(0, (post.likes || 0) - 1)
        })
      );
    } else {
      await db.transact(
        db.tx.posts[postId].update({
          likedBy: [...currentLikedBy, user.id],
          likes: (post.likes || 0) + 1
        })
      );
    }
  };

  const handleClaim = async () => {
    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to claim a task');
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
      const newClaimer = {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
        claimedAt: Date.now()
      };

      await db.transact(
        db.tx.posts[postId].update({
          claimers: [...claimers, newClaimer]
        })
      );

      Alert.alert('Success', 'You have claimed this task! Waiting for approval.');
    } catch (err) {
      console.error('Claim error:', err);
      Alert.alert('Error', 'Failed to claim task');
    }
  };

  const handleApproveClaimer = async (claimerUserId) => {
    try {
      const claimer = claimers.find(c => c.userId === claimerUserId);
      
      await db.transact(
        db.tx.posts[postId].update({
          approvedClaimerId: claimerUserId,
          claimedBy: claimerUserId,
          claimedByName: claimer?.userName || 'Someone'
        })
      );

      Alert.alert('Success', 'Claimer approved!');
    } catch (err) {
      console.error('Approve error:', err);
      Alert.alert('Error', 'Failed to approve claimer');
    }
  };

  const handleMarkComplete = async () => {
    try {
      await db.transact(
        db.tx.posts[postId].update({
          completedByClaimer: true
        })
      );
      Alert.alert('Success', 'Marked as complete! Waiting for poster confirmation.');
    } catch (err) {
      console.error('Complete error:', err);
    }
  };

  const handleConfirmComplete = () => {
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setIsSubmittingRating(true);

    try {
      await db.transact(
        db.tx.posts[postId].update({
          completedByAuthor: true,
          isCompleted: true,
          completedAt: Date.now(),
          helperRating: selectedRating
        })
      );

      setShowRatingModal(false);
      Alert.alert('Success', 'Task completed and helper rated!');
    } catch (err) {
      console.error('Rating error:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Login Required', t('mustBeLoggedInToComment'));
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
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this task on DOTO: ${post.title || 'Help Needed'}\n\n${post.description}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleMessage = async () => {
    if (!user) return;
    
    const conversationId = getConversationId(user.id, post.authorId);
    const participant1Id = user.id < post.authorId ? user.id : post.authorId;
    const participant2Id = user.id < post.authorId ? post.authorId : user.id;
    
    await createOrUpdateConversation(
      conversationId,
      participant1Id,
      participant2Id,
      { name: user.name, avatar: user.avatar },
      { name: post.author, avatar: post.avatar }
    );
    
    navigation.navigate('Chat', { 
      conversationId,
      userName: post.author,
      userAvatar: post.avatar,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Post Content */}
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
            {!isMyPost && user && (
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Title & Description */}
          <Text style={[styles.postTitle, { color: themeColors.text }]}>
            {post.title || t('helpNeeded')}
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
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
                {post.location}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={[styles.actionsRow, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons 
                name={isLiked ? 'heart' : 'heart-outline'} 
                size={24} 
                color={isLiked ? colors.primary : themeColors.textSecondary} 
              />
              <Text style={[styles.actionText, { color: isLiked ? colors.primary : themeColors.textSecondary }]}>
                {likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={24} color={themeColors.textSecondary} />
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>
                {comments.length}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Claim Section */}
        <View style={[styles.claimCard, { 
          backgroundColor: isCompleted ? colors.success : approvedClaimerId ? '#4B5563' : colors.primary 
        }]}>
          {isCompleted ? (
            <>
              <Ionicons name="trophy" size={32} color="#fff" />
              <Text style={styles.claimTitle}>{t('taskCompleted')}</Text>
              {post.helperRating && (
                <View style={styles.ratingDisplay}>
                  {[1,2,3,4,5].map(star => (
                    <Ionicons 
                      key={star}
                      name={star <= post.helperRating ? 'star' : 'star-outline'} 
                      size={24} 
                      color="#FBBF24" 
                    />
                  ))}
                </View>
              )}
            </>
          ) : approvedClaimerId ? (
            <>
              <Ionicons name="checkmark-circle" size={32} color="#fff" />
              <Text style={styles.claimTitle}>
                {isClaimedByMe ? t('claimedByYou') : t('approved')}
              </Text>
              
              {/* Completion Actions */}
              {isClaimedByMe && !completedByClaimer && (
                <TouchableOpacity style={styles.completeButton} onPress={handleMarkComplete}>
                  <Text style={styles.completeButtonText}>{t('markAsComplete')}</Text>
                </TouchableOpacity>
              )}
              
              {isClaimedByMe && completedByClaimer && !completedByAuthor && (
                <Text style={styles.waitingText}>Waiting for poster to confirm...</Text>
              )}
              
              {isMyPost && completedByClaimer && !completedByAuthor && (
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmComplete}>
                  <Text style={styles.confirmButtonText}>{t('confirmAndRate')}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : isMyPost ? (
            <>
              <Text style={styles.claimTitle}>{t('chooseAClaimer')}</Text>
              {claimers.length > 0 ? (
                <View style={styles.claimersList}>
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
                        <Text style={styles.approveButtonText}>{t('approve')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noClaimersText}>{t('noClaimers')}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.claimTitle}>{t('claimNow')}</Text>
              {hasClaimed ? (
                <Text style={styles.waitingText}>{t('waitingForApproval')}</Text>
              ) : (
                <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
                  <Text style={styles.claimButtonText}>{t('claimTask')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Comments Section */}
        <View style={[styles.commentsSection, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.commentsTitle, { color: themeColors.text }]}>
            Comments ({comments.length})
          </Text>

          {/* Add Comment */}
          {user && (
            <View style={styles.addCommentRow}>
              <Image source={{ uri: user.avatar }} style={styles.commentAvatar} />
              <TextInput
                style={[styles.commentInput, { borderColor: themeColors.border, color: themeColors.text }]}
                placeholder={t('writeAComment')}
                placeholderTextColor={themeColors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <Text style={[styles.noCommentsText, { color: themeColors.textSecondary }]}>
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            comments
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .map((comment) => (
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
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="star" size={48} color={colors.star} />
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {t('rateTheHelper')}
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
              {t('howWasYourExperience')}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Ionicons 
                    name={star <= selectedRating ? 'star' : 'star-outline'} 
                    size={40} 
                    color={star <= selectedRating ? colors.star : themeColors.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: themeColors.border }]}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitRating}
                disabled={isSubmittingRating || selectedRating === 0}
              >
                {isSubmittingRating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('submitRating')}</Text>
                )}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  postCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  authorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: typography.lg,
    fontWeight: '700',
  },
  postTime: {
    fontSize: typography.sm,
    marginTop: 2,
  },
  messageButton: {
    padding: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.full,
  },
  postTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  postDescription: {
    fontSize: typography.md,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  photosScroll: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  postPhoto: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: typography.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: typography.md,
    fontWeight: '500',
  },
  claimCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  claimTitle: {
    color: '#fff',
    fontSize: typography.xl,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  claimButton: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  claimButtonText: {
    color: colors.primary,
    fontSize: typography.md,
    fontWeight: '700',
  },
  waitingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.sm,
  },
  claimersList: {
    width: '100%',
    gap: spacing.sm,
  },
  claimerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
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
    fontWeight: '500',
  },
  approveButton: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  approveButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: typography.sm,
  },
  noClaimersText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.sm,
  },
  completeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  completeButtonText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ratingDisplay: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  commentsSection: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.sm,
  },
  commentsTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.base,
  },
  sendButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  noCommentsText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  commentItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: typography.sm,
  },
  commentTime: {
    fontSize: typography.xs,
  },
  commentText: {
    fontSize: typography.base,
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
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  modalSubtitle: {
    fontSize: typography.base,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.success,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
