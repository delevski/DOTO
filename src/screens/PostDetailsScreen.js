import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db, id } from '../lib/instant';
import { useAuth } from '../context/AuthContext';
import { t } from '../utils/translations';
import { getConversationId, createOrUpdateConversation } from '../utils/messaging';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailsScreen({ route, navigation }) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const imageListRef = useRef(null);

  // Fetch post and comments
  const { isLoading, error, data } = db.useQuery({
    posts: { $: { where: { id: postId } } },
    comments: { $: { where: { postId: postId } } }
  });

  const post = data?.posts?.[0];
  const comments = data?.comments || [];

  // Sort comments by newest first
  const sortedComments = [...comments].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  useEffect(() => {
    if (!isLoading && !post) {
      Alert.alert('Error', 'Post not found');
      navigation.goBack();
    }
  }, [isLoading, post]);

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

  const handleLike = () => {
    if (!user || !post) return;

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

  const handleClaim = () => {
    if (!user || !post) return;

    const claimers = post.claimers || [];
    const alreadyClaimed = claimers.some(c => c.userId === user.id);

    if (alreadyClaimed) {
      Alert.alert('Already Claimed', 'You have already submitted a claim for this task.');
      return;
    }

    if (post.authorId === user.id) {
      Alert.alert('Cannot Claim', 'You cannot claim your own post.');
      return;
    }

    const newClaimer = {
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      claimedAt: Date.now(),
    };

    db.transact(
      db.tx.posts[post.id].update({
        claimers: [...claimers, newClaimer]
      })
    );

    Alert.alert('Success', 'Your claim has been submitted! The post owner will review it.');
  };

  const handleApproveClaimer = (claimerUserId) => {
    if (!user || !post || post.authorId !== user.id) return;

    const claimer = post.claimers?.find(c => c.userId === claimerUserId);
    if (!claimer) return;

    Alert.alert(
      'Approve Claimer',
      `Are you sure you want to approve ${claimer.userName} for this task?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            db.transact(
              db.tx.posts[post.id].update({
                approvedClaimerId: claimerUserId,
                approvedClaimerName: claimer.userName,
                approvedClaimerAvatar: claimer.userAvatar,
                approvedAt: Date.now()
              })
            );
          }
        }
      ]
    );
  };

  const handleSubmitComment = () => {
    if (!user || !newComment.trim()) return;

    const commentId = id();
    const commentData = {
      id: commentId,
      postId: postId,
      author: user.name,
      authorId: user.id,
      avatar: user.avatar,
      text: newComment.trim(),
      timestamp: Date.now(),
    };

    db.transact(
      db.tx.comments[commentId].update(commentData),
      db.tx.posts[postId].update({
        comments: (post.comments || 0) + 1
      })
    );

    setNewComment('');
  };

  const handleMessageAuthor = () => {
    if (!user || !post || post.authorId === user.id) return;

    const conversationId = getConversationId(user.id, post.authorId);
    const participant1Id = user.id < post.authorId ? user.id : post.authorId;
    const participant2Id = user.id < post.authorId ? post.authorId : user.id;

    createOrUpdateConversation(
      conversationId,
      participant1Id,
      participant2Id,
      { name: user.name, avatar: user.avatar },
      { name: post.author, avatar: post.avatar }
    );

    navigation.navigate('Chat', { conversationId });
  };

  if (isLoading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  const likedBy = post.likedBy || [];
  const isLiked = user && likedBy.includes(user.id);
  const likeCount = likedBy.length || post.likes || 0;
  const isMyPost = post.authorId === user?.id;
  const claimers = post.claimers || [];
  const hasClaimed = claimers.some(c => c.userId === user?.id);
  const isApproved = !!post.approvedClaimerId;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Author Card */}
        <View style={styles.authorCard}>
          <Image source={{ uri: post.avatar }} style={styles.authorAvatar} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author}</Text>
            <Text style={styles.postTime}>{formatTime(post.timestamp)}</Text>
          </View>
          {!isMyPost && (
            <TouchableOpacity style={styles.messageButton} onPress={handleMessageAuthor}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Post Content */}
        <View style={styles.postContent}>
          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          <Text style={styles.postDescription}>{post.description}</Text>
          
          {post.tag && (
            <View style={styles.tagContainer}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{post.tag}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Images Carousel */}
        {post.photos && post.photos.length > 0 && (
          <View style={styles.imageCarousel}>
            <FlatList
              ref={imageListRef}
              data={post.photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48));
                setCurrentImageIndex(index);
              }}
              renderItem={({ item }) => (
                <Image 
                  source={{ uri: item }} 
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              )}
              keyExtractor={(item, index) => index.toString()}
            />
            {post.photos.length > 1 && (
              <View style={styles.imageIndicators}>
                {post.photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      currentImageIndex === index && styles.indicatorActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Location */}
        {post.location && (
          <View style={styles.locationCard}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={styles.locationText}>{post.location}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? colors.primary : colors.textSecondary} 
            />
            <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.actionCount}>{comments.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-social-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Claim Section */}
        {!isMyPost && !isApproved && (
          <View style={styles.claimSection}>
            <TouchableOpacity
              style={[styles.claimButton, hasClaimed && styles.claimButtonDisabled]}
              onPress={handleClaim}
              disabled={hasClaimed}
            >
              <LinearGradient
                colors={hasClaimed ? [colors.border, colors.border] : [colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimGradient}
              >
                <Ionicons 
                  name={hasClaimed ? "checkmark-circle" : "hand-left"} 
                  size={20} 
                  color={hasClaimed ? colors.textSecondary : colors.white} 
                />
                <Text style={[styles.claimButtonText, hasClaimed && styles.claimButtonTextDisabled]}>
                  {hasClaimed ? 'Claim Submitted' : t('claimTask')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Approved Claimer Badge */}
        {isApproved && (
          <View style={styles.approvedSection}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <View style={styles.approvedInfo}>
              <Text style={styles.approvedLabel}>Approved Claimer</Text>
              <Text style={styles.approvedName}>{post.approvedClaimerName}</Text>
            </View>
            <Image 
              source={{ uri: post.approvedClaimerAvatar }} 
              style={styles.approvedAvatar} 
            />
          </View>
        )}

        {/* Claimers List (for post owner) */}
        {isMyPost && claimers.length > 0 && !isApproved && (
          <View style={styles.claimersSection}>
            <Text style={styles.sectionTitle}>
              Claimers ({claimers.length})
            </Text>
            {claimers.map((claimer) => (
              <View key={claimer.userId} style={styles.claimerCard}>
                <Image 
                  source={{ uri: claimer.userAvatar || 'https://i.pravatar.cc/150' }} 
                  style={styles.claimerAvatar} 
                />
                <View style={styles.claimerInfo}>
                  <Text style={styles.claimerName}>{claimer.userName}</Text>
                  <Text style={styles.claimerTime}>{formatTime(claimer.claimedAt)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApproveClaimer(claimer.userId)}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>
            Comments ({comments.length})
          </Text>
          
          {sortedComments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Image 
                source={{ uri: comment.avatar || 'https://i.pravatar.cc/150' }} 
                style={styles.commentAvatar} 
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.author}</Text>
                  <Text style={styles.commentTime}>{formatTime(comment.timestamp)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            </View>
          ))}

          {comments.length === 0 && (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <Image 
          source={{ uri: user?.avatar || 'https://i.pravatar.cc/150' }} 
          style={styles.inputAvatar} 
        />
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textMuted}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
          onPress={handleSubmitComment}
          disabled={!newComment.trim()}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={newComment.trim() ? colors.primary : colors.textMuted} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  moreButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    ...typography.bodySemibold,
    color: colors.text,
  },
  postTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  messageButton: {
    padding: spacing.sm,
    backgroundColor: colors.tagBg,
    borderRadius: borderRadius.full,
  },
  postContent: {
    padding: spacing.lg,
  },
  postTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  postDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  tagBadge: {
    backgroundColor: colors.tagBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.smallMedium,
    color: colors.tagText,
  },
  imageCarousel: {
    marginBottom: spacing.md,
  },
  carouselImage: {
    width: SCREEN_WIDTH - 48,
    height: 250,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  locationText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionCount: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  actionCountActive: {
    color: colors.primary,
  },
  claimSection: {
    padding: spacing.lg,
  },
  claimButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.button,
  },
  claimButtonDisabled: {
    ...shadows.sm,
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  claimButtonText: {
    ...typography.button,
    color: colors.white,
  },
  claimButtonTextDisabled: {
    color: colors.textSecondary,
  },
  approvedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  approvedInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  approvedLabel: {
    ...typography.caption,
    color: colors.success,
  },
  approvedName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  approvedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  claimersSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  claimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  claimerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  claimerInfo: {
    flex: 1,
  },
  claimerName: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  claimerTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  approveButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  approveButtonText: {
    ...typography.smallMedium,
    color: colors.white,
  },
  commentsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  commentContent: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    ...typography.smallMedium,
    color: colors.text,
  },
  commentTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  commentText: {
    ...typography.body,
    color: colors.text,
  },
  noComments: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.sm,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text,
  },
  sendButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

