import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Share,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import { sendPushNotificationToUser } from '../utils/pushNotifications';
import Icon from '../components/Icon';
import ClaimerSelectionModal from '../components/ClaimerSelectionModal';

function PostDetailsScreen({ route, navigation }) {
  const { postId } = route.params || {};
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  
  const [newComment, setNewComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClaimerModal, setShowClaimerModal] = useState(false);
  
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
      Alert.alert(t('auth.loginRequired') || 'Login Required', t('auth.pleaseLoginToClaim') || 'Please login to claim tasks');
      return;
    }

    if (isMyPost) {
      Alert.alert(t('common.error') || 'Error', t('postDetails.cannotClaimOwn') || 'You cannot claim your own post');
      return;
    }

    if (hasClaimed) {
      Alert.alert(t('postDetails.alreadyClaimed') || 'Already Claimed', t('postDetails.alreadyClaimedDesc') || 'You have already claimed this task');
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
      await sendPushNotificationToUser(
        post.authorId,
        'newClaim',
        { userName: user.name, postTitle: post.title || 'your task' },
        { postId, type: 'post_claimed' }
      );
      
      // Update user's activity streak
      updateUserStreak(user.id);
      
      if (isMountedRef.current) {
        Alert.alert(t('common.success') || 'Success', t('postDetails.claimSuccess') || 'Task claimed! The poster will review your claim.');
      }
    } catch (err) {
      console.error('Claim error:', err);
      if (isMountedRef.current) {
        Alert.alert(t('common.error') || 'Error', t('errors.tryAgain') || 'Failed to claim task');
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

      // Update post with approved claimer info (match web app fields)
      await db.transact(
        db.tx.posts[postId].update({
          approvedClaimerId: claimerUserId,
          claimedBy: claimerUserId,  // For compatibility with web app
          claimedByName: claimer.userName,  // For compatibility with web app
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
      console.log('=== SENDING PUSH NOTIFICATION ===');
      console.log('To user ID:', claimerUserId);
      console.log('Type: claimerApproved');
      
      const pushResult = await sendPushNotificationToUser(
        claimerUserId,
        'claimerApproved',
        { postTitle: post.title || 'a task' },
        { postId, type: 'claimer_approved' }
      );
      
      console.log('Push notification result:', pushResult);
      
      if (isMountedRef.current) {
        const pushStatus = pushResult ? '✅ Push sent!' : '❌ No push token';
        Alert.alert(
          t('common.success') || 'Success', 
          `${claimer.userName} ${t('postDetails.hasBeenApproved') || 'has been approved!'}\n\n${pushStatus}`
        );
      }
    } catch (err) {
      console.error('Approve error:', err);
      if (isMountedRef.current) {
        Alert.alert(t('common.error') || 'Error', t('errors.tryAgain') || 'Failed to approve claimer');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [claimers, postId, post, t]);

  const handleLike = useCallback(async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequired') || 'Login Required', t('auth.pleaseLogin') || 'Please login to like posts');
      return;
    }

    try {
      // Check if user already liked (double-check to prevent race conditions)
      const alreadyLiked = likedBy.includes(user.id);
      
      if (alreadyLiked) {
        // Unlike: Remove user from likedBy array
        await db.transact(
          db.tx.posts[postId].update({
            likedBy: likedBy.filter(uid => uid !== user.id),
            likes: Math.max(0, (post.likes || 0) - 1)
          })
        );
      } else {
        // Like: Add user to likedBy array (ensure no duplicates)
        const newLikedBy = [...new Set([...likedBy, user.id])];
        const now = Date.now();
        
        await db.transact(
          db.tx.posts[postId].update({
            likedBy: newLikedBy,
            likes: newLikedBy.length
          })
        );
        
        // Send push notification to post author (only when liking, not unliking)
        // Don't notify if user is liking their own post
        if (post?.authorId && post.authorId !== user.id) {
          // Create in-app notification
          const notificationId = id();
          await db.transact(
            db.tx.notifications[notificationId].update({
              id: notificationId,
              userId: post.authorId,
              postId: postId,
              type: 'post_liked',
              message: `${user.name} liked your post`,
              read: false,
              timestamp: now,
              postTitle: post.title || 'your post',
              createdAt: now
            })
          );
          
          // Send push notification
          await sendPushNotificationToUser(
            post.authorId,
            'postLiked',
            { userName: user.name, postTitle: post.title || 'your post' },
            { postId, type: 'post_liked' }
          );
        }
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  }, [user, postId, likedBy, post, t]);

  const handleAddComment = useCallback(async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequired') || 'Login Required', t('auth.pleaseLogin') || 'Please login to comment');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const commentId = id();
      const now = Date.now();
      
      await db.transact(
        db.tx.comments[commentId].update({
          id: commentId,
          postId: postId,
          authorId: user.id,
          author: user.name,
          avatar: user.avatar,
          text: newComment.trim(),
          timestamp: now,
        }),
        db.tx.posts[postId].update({
          comments: (post.comments || 0) + 1
        })
      );
      
      // Send push notification to post author (don't notify if commenting on own post)
      if (post?.authorId && post.authorId !== user.id) {
        // Create in-app notification
        const notificationId = id();
        await db.transact(
          db.tx.notifications[notificationId].update({
            id: notificationId,
            userId: post.authorId,
            postId: postId,
            type: 'new_comment',
            message: `${user.name} commented on your post`,
            read: false,
            timestamp: now,
            postTitle: post.title || 'your post',
            createdAt: now
          })
        );
        
        // Send push notification
        await sendPushNotificationToUser(
          post.authorId,
          'newComment',
          { userName: user.name, postTitle: post.title || 'your post' },
          { postId, type: 'new_comment' }
        );
      }
      
      if (isMountedRef.current) {
        setNewComment('');
      }
      
      // Update user's activity streak
      updateUserStreak(user.id);
    } catch (err) {
      console.error('Comment error:', err);
      if (isMountedRef.current) {
        Alert.alert(t('common.error') || 'Error', t('errors.tryAgain') || 'Failed to add comment');
      }
    }
  }, [user, newComment, postId, post, t, updateUserStreak]);

  const handleMarkComplete = useCallback(async () => {
    if (!isClaimedByMe) {
      Alert.alert(t('common.error') || 'Error', t('postDetails.onlyClaimerCanComplete') || 'Only the approved claimer can mark this task as complete');
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
      await sendPushNotificationToUser(
        post.authorId,
        'taskMarkedComplete',
        { postTitle: post.title || 'your task' },
        { postId, type: 'task_marked_complete' }
      );
      
      // Update user's activity streak
      updateUserStreak(user.id);
      
      if (isMountedRef.current) {
        Alert.alert(t('common.success') || 'Success', t('postDetails.markedComplete') || 'Task marked as complete! Waiting for poster confirmation.');
      }
    } catch (err) {
      console.error('Complete error:', err);
      if (isMountedRef.current) {
        Alert.alert(t('common.error') || 'Error', t('errors.tryAgain') || 'Failed to mark as complete');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [isClaimedByMe, postId, post, t, user, updateUserStreak]);

  const handleConfirmAndRate = useCallback(async () => {
    if (selectedRating === 0) {
      Alert.alert(t('postDetails.ratingRequired') || 'Rating Required', t('postDetails.pleaseSelectRating') || 'Please select a rating');
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
      await sendPushNotificationToUser(
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
        Alert.alert(t('common.success') || 'Success', t('postDetails.taskCompletedAndRated') || 'Task completed and helper rated!');
      }
    } catch (err) {
      console.error('Rate error:', err);
      if (isMountedRef.current) {
        Alert.alert(t('common.error') || 'Error', t('errors.tryAgain') || 'Failed to complete task');
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
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>{t('postDetails.loadingPost') || 'Loading post...'}</Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{t('postDetails.postNotFound') || 'Post not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('common.back') || 'Go Back'}</Text>
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
            {post.title || t('post.helpNeeded')}
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
            <View style={[styles.locationRow, { flexDirection: rtlStyles.row }]}>
              <Icon name="location-outline" size={16} color={colors.primary} />
              <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
                {post.location}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={[styles.actionsRow, { borderTopColor: themeColors.border, flexDirection: rtlStyles.row }]}>
            <TouchableOpacity style={[styles.actionButton, { flexDirection: rtlStyles.row }]} onPress={handleLike}>
              <Icon name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? colors.primary : themeColors.textSecondary} />
              <Text style={[styles.actionText, { color: isLiked ? colors.primary : themeColors.textSecondary }]}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { flexDirection: rtlStyles.row }]}>
              <Icon name="chatbubble-outline" size={22} color={themeColors.textSecondary} />
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>{comments.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { flexDirection: rtlStyles.row }]} onPress={handleShare}>
              <Icon name="share-outline" size={22} color={themeColors.textSecondary} style={isRTL ? { transform: [{ scaleX: -1 }] } : null} />
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>{t('common.share')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Claim Section */}
        <View style={[styles.claimCard, { 
          backgroundColor: isCompleted ? '#059669' : approvedClaimerId ? '#4B5563' : colors.primary 
        }]}>
          {isCompleted ? (
            <>
              <View style={[styles.claimTitleRow, { flexDirection: rtlStyles.row }]}>
                <Icon name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.claimTitle}>{t('postDetails.taskCompleted')}</Text>
              </View>
              <Text style={styles.claimSubtitle}>
                {isClaimedByMe ? t('postDetails.youCompletedTask') : t('postDetails.taskHasBeenCompleted')}
              </Text>
              {post.helperRating && (
                <View style={[styles.ratingDisplay, { flexDirection: rtlStyles.row }]}>
                  <Text style={styles.ratingLabel}>{t('postDetails.helperRating')}</Text>
                  <View style={styles.ratingStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon key={star} name={star <= post.helperRating ? 'star' : 'star-outline'} size={18} color="#FCD34D" />
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : approvedClaimerId ? (
            <>
              <View style={[styles.claimTitleRow, { flexDirection: rtlStyles.row }]}>
                <Icon name="checkmark" size={24} color="#fff" />
                <Text style={styles.claimTitle}>{t('postDetails.claimerApproved')}</Text>
              </View>
              {isClaimedByMe ? (
                <>
                  <Text style={styles.claimSubtitle}>{t('postDetails.youAreApprovedHelper')}</Text>
                  {!completedByClaimer ? (
                    <TouchableOpacity style={styles.completeButton} onPress={handleMarkComplete}>
                      <Text style={styles.completeButtonText}>{t('postDetails.markAsComplete')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.waitingText}>{t('postDetails.waitingForConfirmation')}</Text>
                  )}
                </>
              ) : isMyPost ? (
                <>
                  <Text style={styles.claimSubtitle}>
                    {t('postDetails.isHelping', { name: post.approvedClaimerName || t('common.unknown') })}
                  </Text>
                  {completedByClaimer && !completedByAuthor && (
                    <TouchableOpacity style={styles.completeButton} onPress={() => setShowRatingModal(true)}>
                      <Text style={styles.completeButtonText}>{t('postDetails.confirmAndRate')}</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.claimSubtitle}>
                  {t('postDetails.isHelpingWithTask', { name: post.approvedClaimerName || t('common.unknown') })}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.claimTitle}>{t('postDetails.claimThisTask')}</Text>
              <Text style={styles.claimSubtitle}>{t('postDetails.helpAndEarn', { name: post.author })}</Text>
              
              {isMyPost ? (
                claimers.length > 0 ? (
                  <View style={styles.claimersSection}>
                    <Text style={styles.claimersTitle}>{t('postDetails.chooseAClaimer', { count: claimers.length })}</Text>
                    
                    {/* Claimer avatars preview */}
                    <View style={styles.claimersPreview}>
                      {claimers.slice(0, 4).map((claimer, index) => (
                        <Image 
                          key={claimer.userId}
                          source={{ uri: claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}` }}
                          style={[
                            styles.claimerPreviewAvatar,
                            { marginLeft: index > 0 ? -10 : 0, zIndex: claimers.length - index }
                          ]}
                        />
                      ))}
                      {claimers.length > 4 && (
                        <View style={[styles.claimerPreviewMore, { marginLeft: -10 }]}>
                          <Text style={styles.claimerPreviewMoreText}>+{claimers.length - 4}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Claimer Cards with Approve Buttons - Web App Style */}
                    <View style={styles.claimerCardsContainer}>
                      {claimers.map((claimer, idx) => {
                        const claimTime = claimer.claimedAt ? new Date(claimer.claimedAt) : new Date();
                        const timeAgo = Math.floor((Date.now() - claimTime.getTime()) / (1000 * 60 * 60));
                        const timeDisplay = timeAgo < 1 ? t('feed.justNow') : timeAgo < 24 ? `${timeAgo}h ago` : `${Math.floor(timeAgo / 24)}d ago`;
                        
                        return (
                          <View 
                            key={claimer.userId || idx}
                            style={styles.claimerCardWeb}
                          >
                            <Image 
                              source={{ uri: claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}` }}
                              style={styles.claimerCardAvatar}
                            />
                            <View style={styles.claimerCardInfo}>
                              <Text style={styles.claimerCardName}>{claimer.userName || 'Helper'}</Text>
                              <Text style={styles.claimerCardTime}>{timeDisplay}</Text>
                            </View>
                            <TouchableOpacity 
                              style={styles.approveButtonWeb}
                              onPress={() => handleApproveClaimer(claimer.userId)}
                            >
                              <Text style={styles.approveButtonTextWeb}>{t('post.approve')}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noClaimersText}>{t('postDetails.noClaimersYet')}</Text>
                )
              ) : hasClaimed ? (
                <View style={styles.claimedBadge}>
                  <View style={[styles.claimedTextRow, { flexDirection: rtlStyles.row }]}>
                    <Icon name="checkmark" size={18} color="#fff" />
                    <Text style={styles.claimedText}>{t('postDetails.youClaimedTask')}</Text>
                  </View>
                  <Text style={styles.claimedSubtext}>{t('postDetails.waitingForApproval')}</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
                  <Text style={styles.claimButtonText}>{t('postDetails.claimNow')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Comments Section */}
        <View style={[styles.commentsCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.commentsTitle, { color: themeColors.text }]}>
            {t('postDetails.comments')} ({comments.length})
          </Text>

          {/* Add Comment */}
          {user && (
            <View style={[styles.addCommentRow, { flexDirection: rtlStyles.row }]}>
              <Image source={{ uri: user.avatar || `https://i.pravatar.cc/150?u=${user.id}` }} style={styles.commentAvatar} />
              <TextInput
                style={[styles.commentInput, { color: themeColors.text, borderColor: themeColors.border, textAlign: rtlStyles.textAlign }]}
                placeholder={t('postDetails.writeComment')}
                placeholderTextColor={themeColors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={handleAddComment}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleAddComment}>
                <Icon name="send" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <Text style={[styles.noCommentsText, { color: themeColors.textSecondary }]}>
              {t('postDetails.noComments')}
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
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>{t('postDetails.rateHelper')}</Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
              {t('postDetails.howWasExperience')}
            </Text>
            
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)} style={styles.starButton}>
                  <Icon 
                    name={star <= selectedRating ? 'star' : 'star-outline'} 
                    size={36} 
                    color={star <= selectedRating ? '#FCD34D' : themeColors.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.modalButtons, { flexDirection: rtlStyles.row }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitRatingButton]}
                onPress={handleConfirmAndRate}
              >
                <Text style={styles.submitButtonText}>{t('postDetails.submitRating')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Claimer Selection Modal */}
      <ClaimerSelectionModal
        visible={showClaimerModal}
        onClose={() => setShowClaimerModal(false)}
        post={post}
        onApproveClaimer={handleApproveClaimer}
      />
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
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
    alignItems: 'center',
    gap: spacing.xs,
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
  claimTitleRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  claimTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
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
  claimedTextRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
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
  claimersPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  claimerPreviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  claimerPreviewMore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimerPreviewMoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewClaimersButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  viewClaimersButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
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
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ratingLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 2,
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
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  starButton: {
    padding: spacing.xs,
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
  submitRatingButton: {
    backgroundColor: '#059669',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Web App Style Claimer Cards
  claimerCardsContainer: {
    marginTop: spacing.md,
  },
  claimerCardWeb: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  claimerCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  claimerCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  claimerCardName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  claimerCardTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  approveButtonWeb: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveButtonTextWeb: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
