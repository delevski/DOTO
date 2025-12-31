import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Share,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db, id as generateId } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import Icon from '../components/Icon';

const EVENT_CATEGORIES = {
  social: { label: 'Social Meetup', labelHe: 'מפגש חברתי', icon: '🎉', color: '#9333EA' },
  sports: { label: 'Sports', labelHe: 'ספורט', icon: '⚽', color: '#22C55E' },
  volunteering: { label: 'Volunteering', labelHe: 'התנדבות', icon: '🤝', color: '#3B82F6' },
  workshop: { label: 'Workshop', labelHe: 'סדנה', icon: '🎨', color: '#F97316' },
  culture: { label: 'Culture', labelHe: 'תרבות', icon: '🎭', color: '#EC4899' },
  other: { label: 'Other', labelHe: 'אחר', icon: '📌', color: '#6B7280' },
};

const STATUS_BADGES = {
  upcoming: { label: 'Upcoming', labelHe: 'קרוב', color: '#22C55E' },
  ongoing: { label: 'Happening Now', labelHe: 'מתרחש כעת', color: '#3B82F6' },
  completed: { label: 'Completed', labelHe: 'הסתיים', color: '#6B7280' },
  cancelled: { label: 'Cancelled', labelHe: 'בוטל', color: '#EF4444' },
};

export default function CommunityEventDetailsScreen({ route, navigation }) {
  const { eventId } = route.params;
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const { alert, confirm } = useDialog();

  const [newComment, setNewComment] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch event and comments
  const { isLoading, error, data } = db.useQuery({
    communityEvents: {
      $: { where: { id: eventId } }
    },
    eventComments: {
      $: { where: { eventId: eventId } }
    }
  });

  const event = data?.communityEvents?.[0];
  const comments = data?.eventComments || [];

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#9333EA" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeColors.background }]}>
        <Icon name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorText, { color: themeColors.text }]}>
          {t('events.eventNotFound') || 'Event not found'}
        </Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>{t('common.back') || 'Go Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMyEvent = event.authorId === user?.id;
  const subscribers = event.subscribers || [];
  const blockedUsers = event.blockedUsers || [];
  const isSubscribed = user && subscribers.some(s => s.userId === user.id);
  const isBlocked = user && blockedUsers.includes(user.id);
  const likedBy = event.likedBy || [];
  const isLiked = user && likedBy.includes(user.id);
  const likeCount = likedBy.length || 0;
  const subscriberCount = subscribers.length;
  const maxParticipants = event.maxParticipants;
  const isFull = maxParticipants && subscriberCount >= maxParticipants;
  const categoryInfo = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.other;
  const statusInfo = STATUS_BADGES[event.status] || STATUS_BADGES.upcoming;

  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const date = new Date(`${dateStr}T${timeStr || '00:00'}`);
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatEventTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeUntilEvent = () => {
    if (!event.eventDateTime) return null;
    const now = Date.now();
    const diff = event.eventDateTime - now;
    
    if (diff < 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return t('events.startingSoon') || 'Starting soon';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return t('feed.justNow') || 'Just now';
  };

  const handleSubscribe = async () => {
    if (!user) {
      alert(t('auth.loginRequired'), t('auth.pleaseLogin'));
      return;
    }

    if (isBlocked) {
      alert(t('common.error'), t('events.youAreBlockedFromEvent') || 'You are blocked from this event');
      return;
    }

    if (isFull && !isSubscribed) {
      alert(t('common.error'), t('events.eventIsFull') || 'This event is full');
      return;
    }

    setIsSubscribing(true);

    try {
      if (isSubscribed) {
        const newSubscribers = subscribers.filter(s => s.userId !== user.id);
        await db.transact(
          db.tx.communityEvents[eventId].update({ subscribers: newSubscribers })
        );
      } else {
        const newSubscriber = {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
          subscribedAt: Date.now()
        };
        await db.transact(
          db.tx.communityEvents[eventId].update({ subscribers: [...subscribers, newSubscriber] })
        );
      }
    } catch (err) {
      console.error('Subscribe error:', err);
      alert(t('common.error'), t('events.failedToSubscribe') || 'Failed to subscribe');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleKickUser = async (userId) => {
    if (!isMyEvent) return;
    
    try {
      const newSubscribers = subscribers.filter(s => s.userId !== userId);
      await db.transact(
        db.tx.communityEvents[eventId].update({ subscribers: newSubscribers })
      );
    } catch (err) {
      console.error('Kick user error:', err);
      alert(t('common.error'), t('events.failedToRemoveUser') || 'Failed to remove user');
    }
  };

  const handleBlockUser = async (userId) => {
    if (!isMyEvent) return;
    
    try {
      const newSubscribers = subscribers.filter(s => s.userId !== userId);
      const newBlockedUsers = [...blockedUsers, userId];
      await db.transact(
        db.tx.communityEvents[eventId].update({
          subscribers: newSubscribers,
          blockedUsers: newBlockedUsers
        })
      );
    } catch (err) {
      console.error('Block user error:', err);
      alert(t('common.error'), t('events.failedToBlockUser') || 'Failed to block user');
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert(t('auth.loginRequired'), t('auth.pleaseLogin'));
      return;
    }

    const currentLikedBy = event.likedBy || [];
    const isCurrentlyLiked = currentLikedBy.includes(user.id);
    
    if (isCurrentlyLiked) {
      await db.transact(
        db.tx.communityEvents[eventId].update({
          likedBy: currentLikedBy.filter(id => id !== user.id),
          likesCount: Math.max(0, (event.likesCount || 0) - 1)
        })
      );
    } else {
      await db.transact(
        db.tx.communityEvents[eventId].update({
          likedBy: [...currentLikedBy, user.id],
          likesCount: (event.likesCount || 0) + 1
        })
      );
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      alert(t('auth.loginRequired'), t('auth.pleaseLogin'));
      return;
    }

    if (!newComment.trim()) return;

    const commentId = generateId();
    const comment = {
      id: commentId,
      eventId: eventId,
      authorId: user.id,
      author: user.name,
      avatar: user.avatar,
      text: newComment.trim(),
      timestamp: Date.now(),
      createdAt: Date.now()
    };

    await db.transact(
      db.tx.eventComments[commentId].update(comment),
      db.tx.communityEvents[eventId].update({
        commentsCount: (event.commentsCount || 0) + 1
      })
    );

    setNewComment('');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${event.title}\n\n${event.description}\n\n📍 ${event.location}\n📅 ${formatEventDate(event.eventDate, event.eventTime)}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCancelEvent = async () => {
    if (!isMyEvent) return;
    
    confirm(
      t('events.cancelEvent') || 'Cancel Event',
      t('events.areYouSureCancelEvent') || 'Are you sure you want to cancel this event?',
      async () => {
        await db.transact(
          db.tx.communityEvents[eventId].update({ status: 'cancelled' })
        );
      }
    );
  };

  const timeUntilEvent = getTimeUntilEvent();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9333EA']} />}
      >
        {/* Cover Image */}
        {event.coverImage ? (
          <View style={styles.coverContainer}>
            <Image source={{ uri: event.coverImage }} style={styles.coverImage} />
            <View style={styles.coverOverlay} />
            <View style={[styles.coverBadges, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color }]}>
                <Text style={styles.categoryBadgeText}>{categoryInfo.icon} {isRTL ? categoryInfo.labelHe : categoryInfo.label}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                <Text style={styles.statusBadgeText}>{isRTL ? statusInfo.labelHe : statusInfo.label}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.noCoverContainer, { backgroundColor: categoryInfo.color }]}>
            <Text style={styles.noCoverIcon}>{categoryInfo.icon}</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          {/* Author Info */}
          <View style={[styles.authorRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Image
              source={{ uri: event.authorAvatar || `https://i.pravatar.cc/150?u=${event.authorId}` }}
              style={styles.authorAvatar}
            />
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.authorNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.authorName, { color: themeColors.text }]}>{event.authorName}</Text>
                {isMyEvent && (
                  <View style={styles.organizerBadge}>
                    <Icon name="star" size={12} color="#9333EA" />
                    <Text style={styles.organizerText}>{t('events.organizer') || 'Organizer'}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.timestamp, { color: themeColors.textSecondary }]}>
                {formatTime(event.createdAt)}
              </Text>
            </View>
            {isMyEvent && (
              <TouchableOpacity style={styles.menuButton} onPress={handleCancelEvent}>
                <Icon name="ellipsis-horizontal" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Event Title */}
          <Text style={[styles.eventTitle, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {event.title}
          </Text>

          {/* Event Description */}
          <Text style={[styles.eventDescription, { color: themeColors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {event.description}
          </Text>

          {/* Event Details Card */}
          <View style={[styles.detailsCard, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.detailIcon, { backgroundColor: '#F3E8FF' }]}>
                <Icon name="calendar-outline" size={20} color="#9333EA" />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.detailLabel, { color: themeColors.text }]}>
                  {formatEventDate(event.eventDate, event.eventTime)}
                </Text>
                <Text style={[styles.detailSubLabel, { color: themeColors.textSecondary }]}>
                  {formatEventTime(event.eventTime)}
                  {timeUntilEvent && ` • ${t('events.in') || 'In'} ${timeUntilEvent}`}
                </Text>
              </View>
            </View>

            <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.detailIcon, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="location-outline" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.detailLabel, { color: themeColors.text }]}>{event.location}</Text>
              </View>
            </View>

            <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.detailIcon, { backgroundColor: '#DBEAFE' }]}>
                <Icon name="people-outline" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.detailLabel, { color: themeColors.text }]}>
                  {subscriberCount} {t('events.subscribers') || 'subscribers'}
                  {maxParticipants && ` / ${maxParticipants}`}
                </Text>
                {maxParticipants && (
                  <View style={styles.capacityBar}>
                    <View 
                      style={[
                        styles.capacityFill, 
                        { 
                          width: `${Math.min(100, (subscriberCount / maxParticipants) * 100)}%`,
                          backgroundColor: isFull ? '#EF4444' : '#9333EA'
                        }
                      ]} 
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Subscribers Preview */}
          {subscribers.length > 0 && (
            <View style={styles.subscribersSection}>
              <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  {t('events.subscribersTitle') || 'People Going'} ({subscriberCount})
                </Text>
                {isMyEvent && (
                  <TouchableOpacity onPress={() => setShowSubscribersModal(true)}>
                    <Text style={styles.manageLink}>{t('events.manageSubscribers') || 'Manage'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.subscribersRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {subscribers.slice(0, 6).map((sub, index) => (
                  <Image
                    key={sub.userId}
                    source={{ uri: sub.userAvatar }}
                    style={[styles.subscriberAvatar, { marginLeft: index === 0 ? 0 : -8 }]}
                  />
                ))}
                {subscribers.length > 6 && (
                  <View style={[styles.moreSubscribers, { marginLeft: -8 }]}>
                    <Text style={styles.moreSubscribersText}>+{subscribers.length - 6}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Subscribe Button */}
          {!isMyEvent && event.status !== 'cancelled' && (
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                isSubscribed && styles.subscribedButton,
                (isFull && !isSubscribed) && styles.fullButton,
                isBlocked && styles.blockedButton,
              ]}
              onPress={handleSubscribe}
              disabled={isSubscribing || isBlocked || (isFull && !isSubscribed)}
            >
              {isSubscribing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={[styles.subscribeContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Icon 
                    name={isSubscribed ? 'notifications-off' : isBlocked ? 'ban' : 'notifications'} 
                    size={20} 
                    color={isSubscribed ? '#9333EA' : '#fff'} 
                  />
                  <Text style={[styles.subscribeText, isSubscribed && styles.subscribedText]}>
                    {isBlocked ? (t('events.blocked') || 'Blocked') 
                      : isSubscribed ? (t('events.unsubscribe') || 'Unsubscribe') 
                      : isFull ? (t('events.full') || 'Full')
                      : (t('events.subscribe') || 'Subscribe')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Icon 
                name={isLiked ? 'heart' : 'heart-outline'} 
                size={24} 
                color={isLiked ? '#EF4444' : themeColors.textSecondary} 
              />
              <Text style={[styles.actionText, { color: isLiked ? '#EF4444' : themeColors.textSecondary }]}>
                {likeCount}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="chatbubble-outline" size={24} color={themeColors.textSecondary} />
              <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>{comments.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Icon name="share-outline" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('events.comments') || 'Comments'} ({comments.length})
            </Text>

            {/* Add Comment */}
            {user && (
              <View style={[styles.addCommentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Image source={{ uri: user.avatar }} style={styles.commentAvatar} />
                <TextInput
                  style={[styles.commentInput, { color: themeColors.text, borderColor: themeColors.border, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('postDetails.writeComment') || 'Write a comment...'}
                  placeholderTextColor={themeColors.textSecondary}
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <TouchableOpacity 
                  style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Icon name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <Text style={[styles.noComments, { color: themeColors.textSecondary }]}>
                {t('events.noCommentsYet') || 'No comments yet. Be the first to comment!'}
              </Text>
            ) : (
              comments
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .map(comment => (
                  <View key={comment.id} style={[styles.commentItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Image 
                      source={{ uri: comment.avatar || `https://i.pravatar.cc/150?u=${comment.authorId}` }} 
                      style={styles.commentAvatar} 
                    />
                    <View style={[styles.commentContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <View style={[styles.commentHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.commentAuthor, { color: themeColors.text }]}>{comment.author}</Text>
                        <Text style={[styles.commentTime, { color: themeColors.textSecondary }]}>
                          {formatTime(comment.timestamp)}
                        </Text>
                      </View>
                      <Text style={[styles.commentText, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                        {comment.text}
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Subscribers Management Modal */}
      <Modal
        visible={showSubscribersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubscribersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {t('events.manageSubscribers') || 'Manage Subscribers'} ({subscriberCount})
              </Text>
              <TouchableOpacity onPress={() => setShowSubscribersModal(false)}>
                <Icon name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {subscribers.length === 0 ? (
              <Text style={[styles.noSubscribers, { color: themeColors.textSecondary }]}>
                {t('events.noSubscribersYet') || 'No subscribers yet'}
              </Text>
            ) : (
              <FlatList
                data={subscribers}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => (
                  <View style={[styles.subscriberItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Image source={{ uri: item.userAvatar }} style={styles.subscriberItemAvatar} />
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.subscriberName, { color: themeColors.text }]}>{item.userName}</Text>
                      <Text style={[styles.subscriberJoined, { color: themeColors.textSecondary }]}>
                        {t('events.joined') || 'Joined'} {formatTime(item.subscribedAt)}
                      </Text>
                    </View>
                    <View style={[styles.subscriberActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity 
                        style={styles.kickButton}
                        onPress={() => handleKickUser(item.userId)}
                      >
                        <Icon name="remove-circle-outline" size={20} color="#F97316" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.blockButton}
                        onPress={() => handleBlockUser(item.userId)}
                      >
                        <Icon name="ban" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  goBackButton: {
    backgroundColor: '#9333EA',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  goBackText: {
    color: '#fff',
    fontWeight: '600',
  },
  coverContainer: {
    position: 'relative',
    height: 200,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  coverBadges: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noCoverContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCoverIcon: {
    fontSize: 48,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  authorRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: spacing.md,
  },
  authorNameRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  organizerText: {
    color: '#9333EA',
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    padding: spacing.sm,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  eventDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  detailsCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailSubLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  capacityBar: {
    width: 100,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 2,
  },
  subscribersSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  manageLink: {
    color: '#9333EA',
    fontWeight: '600',
  },
  subscribersRow: {
    alignItems: 'center',
  },
  subscriberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreSubscribers: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreSubscribersText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  subscribeButton: {
    backgroundColor: '#9333EA',
    paddingVertical: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  subscribedButton: {
    backgroundColor: '#F3E8FF',
  },
  fullButton: {
    backgroundColor: '#E5E7EB',
  },
  blockedButton: {
    backgroundColor: '#FEE2E2',
  },
  subscribeContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  subscribeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  subscribedText: {
    color: '#9333EA',
  },
  actionsRow: {
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: spacing.md,
  },
  addCommentRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
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
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#9333EA',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  noComments: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  commentItem: {
    marginBottom: spacing.lg,
  },
  commentContent: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  commentHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: spacing.lg,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noSubscribers: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  subscriberItem: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subscriberItemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginHorizontal: spacing.sm,
  },
  subscriberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  subscriberJoined: {
    fontSize: 12,
    marginTop: 2,
  },
  subscriberActions: {
    gap: spacing.sm,
  },
  kickButton: {
    padding: spacing.sm,
  },
  blockButton: {
    padding: spacing.sm,
  },
});





