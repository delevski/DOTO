import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Clock, Share2, MessageCircle, Heart, Calendar, Users, 
  CheckCircle, AlertCircle, MoreHorizontal, Edit, Trash2, Save, X, Image, 
  Send, Copy, UserPlus, UserMinus, Ban, Sparkles, Bell, BellOff, Crown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';
import { ISRAEL_CENTER, ISRAEL_BOUNDS } from '../utils/israelBounds';
import { getConversationId, createOrUpdateConversation } from '../utils/messaging';

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Event categories with icons and colors
const EVENT_CATEGORIES = {
  social: { label: 'Social Meetup', labelHe: 'מפגש חברתי', icon: '🎉', color: 'bg-purple-100 text-purple-700' },
  sports: { label: 'Sports', labelHe: 'ספורט', icon: '⚽', color: 'bg-green-100 text-green-700' },
  volunteering: { label: 'Volunteering', labelHe: 'התנדבות', icon: '🤝', color: 'bg-blue-100 text-blue-700' },
  workshop: { label: 'Workshop', labelHe: 'סדנה', icon: '🎨', color: 'bg-orange-100 text-orange-700' },
  culture: { label: 'Culture', labelHe: 'תרבות', icon: '🎭', color: 'bg-pink-100 text-pink-700' },
  other: { label: 'Other', labelHe: 'אחר', icon: '📌', color: 'bg-gray-100 text-gray-700' },
};

// Status badges
const STATUS_BADGES = {
  upcoming: { label: 'Upcoming', labelHe: 'קרוב', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ongoing: { label: 'Happening Now', labelHe: 'מתרחש כעת', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', labelHe: 'הסתיים', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  cancelled: { label: 'Cancelled', labelHe: 'בוטל', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

// Component to enforce Israel bounds on map
function MapBoundsEnforcer() {
  const map = useMap();
  
  useEffect(() => {
    const bounds = L.latLngBounds(ISRAEL_BOUNDS);
    map.setMaxBounds(bounds);
    map.setMinZoom(8);
    map.setMaxZoom(18);
  }, [map]);
  
  return null;
}

export default function CommunityEventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const menuRef = useRef(null);
  const shareMenuRef = useRef(null);
  
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Fetch event and comments from InstantDB
  const { isLoading, error, data } = db.useQuery({ 
    communityEvents: { 
      $: { 
        where: { id: eventId } 
      } 
    },
    eventComments: {
      $: {
        where: { eventId: eventId }
      }
    }
  });
  
  const event = data?.communityEvents?.[0];
  const comments = data?.eventComments || [];

  useEffect(() => {
    if (!isLoading && !error && !event) {
      navigate('/feed');
    }
  }, [event, isLoading, error, navigate]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return null;
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
  const eventCoordinates = event.coordinates || ISRAEL_CENTER;

  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const date = new Date(`${dateStr}T${timeStr || '00:00'}`);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', options);
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
    
    if (days > 0) {
      return `${days} ${days === 1 ? (t('day') || 'day') : (t('days') || 'days')}`;
    }
    if (hours > 0) {
      return `${hours} ${hours === 1 ? (t('hr') || 'hour') : (t('hrs') || 'hours')}`;
    }
    return t('startingSoon') || 'Starting soon';
  };

  const handleSubscribe = async () => {
    if (!user) {
      setLocalError(t('mustBeLoggedIn') || 'You must be logged in');
      return;
    }

    if (isBlocked) {
      setLocalError(t('youAreBlockedFromEvent') || 'You are blocked from this event');
      return;
    }

    if (isFull && !isSubscribed) {
      setLocalError(t('eventIsFull') || 'This event is full');
      return;
    }

    setIsSubscribing(true);
    setLocalError('');

    try {
      if (isSubscribed) {
        // Unsubscribe
        const newSubscribers = subscribers.filter(s => s.userId !== user.id);
        await db.transact(
          db.tx.communityEvents[eventId].update({
            subscribers: newSubscribers
          })
        );
        setLocalSuccess(t('unsubscribedFromEvent') || 'You have unsubscribed from this event');
      } else {
        // Subscribe
        const newSubscriber = {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
          subscribedAt: Date.now()
        };
        await db.transact(
          db.tx.communityEvents[eventId].update({
            subscribers: [...subscribers, newSubscriber]
          })
        );
        setLocalSuccess(t('subscribedToEvent') || 'You have subscribed to this event!');
      }
    } catch (err) {
      console.error('Subscribe error:', err);
      setLocalError(err.message || t('failedToSubscribe') || 'Failed to subscribe');
    } finally {
      setIsSubscribing(false);
      setTimeout(() => setLocalSuccess(''), 3000);
    }
  };

  const handleKickUser = async (userId) => {
    if (!isMyEvent) return;
    
    try {
      const newSubscribers = subscribers.filter(s => s.userId !== userId);
      await db.transact(
        db.tx.communityEvents[eventId].update({
          subscribers: newSubscribers
        })
      );
      setLocalSuccess(t('userRemoved') || 'User removed from event');
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (err) {
      console.error('Kick user error:', err);
      setLocalError(t('failedToRemoveUser') || 'Failed to remove user');
    }
  };

  const handleBlockUser = async (userId) => {
    if (!isMyEvent) return;
    
    try {
      // Remove from subscribers and add to blocked
      const newSubscribers = subscribers.filter(s => s.userId !== userId);
      const newBlockedUsers = [...blockedUsers, userId];
      
      await db.transact(
        db.tx.communityEvents[eventId].update({
          subscribers: newSubscribers,
          blockedUsers: newBlockedUsers
        })
      );
      setLocalSuccess(t('userBlocked') || 'User has been blocked');
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (err) {
      console.error('Block user error:', err);
      setLocalError(t('failedToBlockUser') || 'Failed to block user');
    }
  };

  const handleLike = async () => {
    if (!user) {
      setLocalError(t('mustBeLoggedInToLike'));
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
      setLocalError(t('mustBeLoggedIn') || 'You must be logged in');
      return;
    }

    if (!newComment.trim()) return;

    const commentId = id();
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

  const handleDeleteComment = (commentId) => {
    if (!user) return;
    
    const comment = comments.find(c => c.id === commentId);
    if (comment && (comment.authorId === user.id || isMyEvent)) {
      if (window.confirm(t('areYouSureDeleteComment') || 'Are you sure you want to delete this comment?')) {
        db.transact(
          db.tx.eventComments[commentId].delete(),
          db.tx.communityEvents[eventId].update({
            commentsCount: Math.max(0, (event.commentsCount || 0) - 1)
          })
        );
      }
    }
  };

  const handleShare = async (type) => {
    const eventUrl = `${window.location.origin}/community-event/${eventId}`;
    
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(eventUrl);
        setLocalSuccess(t('linkCopiedToClipboard'));
        setShowShareMenu(false);
        setTimeout(() => setLocalSuccess(''), 2000);
      } catch (err) {
        setLocalError(t('failedToCopyLink') || 'Failed to copy link');
      }
    } else if (type === 'native') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: event.title,
            text: event.description,
            url: eventUrl
          });
          setShowShareMenu(false);
        } catch (err) {
          if (err.name !== 'AbortError') {
            handleShare('copy');
          }
        }
      } else {
        handleShare('copy');
      }
    }
  };

  const handleCancelEvent = async () => {
    if (!isMyEvent) return;
    
    if (window.confirm(t('areYouSureCancelEvent') || 'Are you sure you want to cancel this event?')) {
      await db.transact(
        db.tx.communityEvents[eventId].update({
          status: 'cancelled'
        })
      );
      setLocalSuccess(t('eventCancelled') || 'Event has been cancelled');
    }
    setShowMenu(false);
  };

  const handleDeleteEvent = async () => {
    if (!isMyEvent) return;
    
    if (window.confirm(t('areYouSureDeleteEvent') || 'Are you sure you want to delete this event? This cannot be undone.')) {
      await db.transact(
        db.tx.communityEvents[eventId].delete()
      );
      navigate('/feed');
    }
    setShowMenu(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} ${days > 1 ? t('days') : t('day')} ${t('ago')}`;
    if (hours > 0) return `${hours} ${hours > 1 ? t('hrs') : t('hr')} ${t('ago')}`;
    return t('justNow');
  };

  const timeUntilEvent = getTimeUntilEvent();

  return (
    <div className={`max-w-5xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <button 
        onClick={() => navigate(-1)} 
        className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft size={20} className={`${isRTL ? 'rtl-flip group-hover:translate-x-1' : 'group-hover:-translate-x-1'} transition-transform`} />
        <span className="font-medium">{t('back')} {t('feed')}</span>
      </button>

      {localError && (
        <div className={`mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle size={20} />
          <span>{localError}</span>
        </div>
      )}

      {localSuccess && (
        <div className={`mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CheckCircle size={20} />
          <span>{localSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Cover Image */}
            {event.coverImage ? (
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={event.coverImage} 
                  alt={event.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 start-4 end-4">
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryInfo.color}`}>
                      {categoryInfo.icon} {isRTL ? categoryInfo.labelHe : categoryInfo.label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                      {isRTL ? statusInfo.labelHe : statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles size={48} className="text-white/50" />
              </div>
            )}

            <div className="p-8">
              {/* Header */}
              <div className={`flex items-start justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex gap-4 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img 
                    src={event.authorAvatar || `https://i.pravatar.cc/150?u=${event.authorId}`} 
                    alt={event.authorName} 
                    className="w-14 h-14 rounded-full object-cover ring-4 ring-purple-100 dark:ring-purple-900"
                  />
                  <div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{event.authorName}</h2>
                      {isMyEvent && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                          <Crown size={12} />
                          {t('organizer') || 'Organizer'}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatTime(event.createdAt)}</span>
                  </div>
                </div>
                
                {isMyEvent && (
                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setShowMenu(!showMenu)}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {showMenu && (
                      <div className="absolute end-0 top-10 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                        <button
                          onClick={() => {
                            navigate(`/new-community-event?edit=${eventId}`);
                            setShowMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Edit size={16} />
                          {t('edit')}
                        </button>
                        {event.status !== 'cancelled' && (
                          <button
                            onClick={handleCancelEvent}
                            className={`w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <X size={16} />
                            {t('cancelEvent') || 'Cancel Event'}
                          </button>
                        )}
                        <button
                          onClick={handleDeleteEvent}
                          className={`w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Trash2 size={16} />
                          {t('delete')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Event Title */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{event.title}</h1>
              
              {/* Event Description */}
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg mb-6 whitespace-pre-wrap">
                {event.description}
              </p>

              {/* Event Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 space-y-4 mb-6">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Calendar size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatEventDate(event.eventDate, event.eventTime)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatEventTime(event.eventTime)}
                      {timeUntilEvent && (
                        <span className="ms-2 text-purple-600 dark:text-purple-400 font-medium">
                          • {t('in') || 'In'} {timeUntilEvent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <MapPin size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{event.location}</div>
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {subscriberCount} {t('subscribers') || 'subscribers'}
                      {maxParticipants && (
                        <span className="text-gray-500 dark:text-gray-400"> / {maxParticipants} {t('max') || 'max'}</span>
                      )}
                    </div>
                    {maxParticipants && (
                      <div className="mt-1 w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min(100, (subscriberCount / maxParticipants) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Map Preview */}
              {eventCoordinates && (
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6 overflow-hidden">
                  <MapContainer 
                    center={eventCoordinates} 
                    zoom={14} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    dragging={false}
                  >
                    <MapBoundsEnforcer />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <Marker position={eventCoordinates}>
                      <Popup>{event.location}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              )}

              {/* Subscribers Preview */}
              {subscribers.length > 0 && (
                <div className="mb-6">
                  <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t('subscribersTitle') || 'People Going'} ({subscriberCount})
                    </h3>
                    {isMyEvent && (
                      <button
                        onClick={() => setShowSubscribersModal(true)}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                      >
                        {t('manageSubscribers') || 'Manage'}
                      </button>
                    )}
                  </div>
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {subscribers.slice(0, 8).map((sub, index) => (
                      <img
                        key={sub.userId}
                        src={sub.userAvatar}
                        alt={sub.userName}
                        className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 object-cover -ms-2 first:ms-0"
                        style={{ zIndex: subscribers.length - index }}
                        title={sub.userName}
                      />
                    ))}
                    {subscribers.length > 8 && (
                      <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300 -ms-2">
                        +{subscribers.length - 8}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={`flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'} hover:text-red-500 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Heart size={22} className={isLiked ? 'fill-red-500' : 'group-hover:fill-current'} />
                    <span className="font-medium">{likeCount}</span>
                  </button>
                  <button 
                    onClick={() => document.getElementById('comment-input')?.focus()}
                    className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <MessageCircle size={22} />
                    <span className="font-medium">{comments.length}</span>
                  </button>
                  <div className="relative" ref={shareMenuRef}>
                    <button 
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Share2 size={22} />
                    </button>
                    {showShareMenu && (
                      <div className="absolute end-0 top-10 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                        {navigator.share && (
                          <button
                            onClick={() => handleShare('native')}
                            className={`w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Share2 size={16} />
                            {t('shareVia') || 'Share via...'}
                          </button>
                        )}
                        <button
                          onClick={() => handleShare('copy')}
                          className={`w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Copy size={16} />
                          {t('copyLink') || 'Copy Link'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              {t('comments') || 'Comments'} ({comments.length})
            </h3>
            
            {/* Add Comment Form */}
            {user && (
              <div className={`mb-6 pb-6 border-b border-gray-100 dark:border-gray-700`}>
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 flex gap-2">
                    <input
                      id="comment-input"
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      placeholder={t('writeAComment')}
                      className="flex-1 px-4 py-2 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  {t('noCommentsYet') || 'No comments yet. Be the first to comment!'}
                </p>
              ) : (
                comments
                  .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                  .map(comment => (
                    <div key={comment.id} className={`flex gap-4 group ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <img 
                        src={comment.avatar || `https://i.pravatar.cc/150?u=${comment.authorId}`} 
                        alt={comment.author} 
                        className="w-10 h-10 rounded-full flex-shrink-0" 
                      />
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="font-semibold text-gray-900 dark:text-white">{comment.author}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(comment.timestamp)}</span>
                          {(comment.authorId === user?.id || isMyEvent) && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="ms-auto opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{comment.text}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscribe Card */}
          <div className={`rounded-2xl shadow-xl p-8 text-white sticky top-8 ${
            event.status === 'cancelled' 
              ? 'bg-gradient-to-br from-gray-600 to-gray-700'
              : isSubscribed
                ? 'bg-gradient-to-br from-green-600 to-emerald-500'
                : 'bg-gradient-to-br from-purple-600 to-pink-500'
          }`}>
            {event.status === 'cancelled' ? (
              <>
                <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <X size={24} />
                  <h3 className="text-2xl font-bold">{t('eventCancelled') || 'Event Cancelled'}</h3>
                </div>
                <p className="text-gray-200">
                  {t('eventCancelledDescription') || 'This event has been cancelled by the organizer.'}
                </p>
              </>
            ) : (
              <>
                <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {isSubscribed ? <CheckCircle size={24} /> : <Sparkles size={24} />}
                  <h3 className="text-2xl font-bold">
                    {isSubscribed ? (t('youreGoing') || "You're Going!") : (t('joinThisEvent') || 'Join This Event')}
                  </h3>
                </div>
                
                {!isMyEvent && (
                  <>
                    {isBlocked ? (
                      <div className="bg-white/10 p-4 rounded-xl text-center mb-6">
                        <p className="font-medium">{t('youAreBlockedFromEvent') || 'You are blocked from this event'}</p>
                      </div>
                    ) : isFull && !isSubscribed ? (
                      <div className="bg-white/10 p-4 rounded-xl text-center mb-6">
                        <p className="font-medium">{t('eventIsFull') || 'This event is full'}</p>
                      </div>
                    ) : (
                      <button 
                        onClick={handleSubscribe}
                        disabled={isSubscribing}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transition-colors text-lg mb-6 flex items-center justify-center gap-2 ${
                          isSubscribed 
                            ? 'bg-white/20 hover:bg-white/30 text-white'
                            : 'bg-white text-purple-600 hover:bg-gray-50'
                        } disabled:opacity-50`}
                      >
                        {isSubscribing ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : isSubscribed ? (
                          <>
                            <BellOff size={20} />
                            {t('unsubscribe') || 'Unsubscribe'}
                          </>
                        ) : (
                          <>
                            <Bell size={20} />
                            {t('subscribe') || 'Subscribe'}
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}

                <div className="space-y-3">
                  <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-white/80">{t('participants') || 'Participants'}</span>
                    <span className="font-bold">
                      {subscriberCount}{maxParticipants ? `/${maxParticipants}` : ''}
                    </span>
                  </div>
                  {timeUntilEvent && (
                    <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-white/80">{t('startsIn') || 'Starts in'}</span>
                      <span className="font-bold">{timeUntilEvent}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Organizer Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              {t('organizer') || 'Organizer'}
            </h3>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img 
                src={event.authorAvatar || `https://i.pravatar.cc/150?u=${event.authorId}`}
                alt={event.authorName}
                className="w-14 h-14 rounded-full"
              />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{event.authorName}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('eventOrganizer') || 'Event Organizer'}
                </div>
              </div>
            </div>
            {!isMyEvent && user && (
              <button 
                onClick={() => {
                  const conversationId = getConversationId(user.id, event.authorId);
                  createOrUpdateConversation(
                    conversationId,
                    user.id < event.authorId ? user.id : event.authorId,
                    user.id < event.authorId ? event.authorId : user.id,
                    { name: user.name, avatar: user.avatar },
                    { name: event.authorName, avatar: event.authorAvatar }
                  );
                  navigate(`/messages?conversation=${conversationId}`);
                }}
                className="w-full mt-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                {t('sendMessage')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscribers Management Modal */}
      {showSubscribersModal && isMyEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className={`flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('manageSubscribers') || 'Manage Subscribers'} ({subscriberCount})
              </h3>
              <button
                onClick={() => setShowSubscribersModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {subscribers.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('noSubscribersYet') || 'No subscribers yet'}
                </p>
              ) : (
                <div className="space-y-4">
                  {subscribers.map(sub => (
                    <div key={sub.userId} className={`flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <img
                        src={sub.userAvatar}
                        alt={sub.userName}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{sub.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('joined') || 'Joined'} {formatTime(sub.subscribedAt)}
                        </div>
                      </div>
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => handleKickUser(sub.userId)}
                          className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          title={t('removeFromEvent') || 'Remove from event'}
                        >
                          <UserMinus size={18} />
                        </button>
                        <button
                          onClick={() => handleBlockUser(sub.userId)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('blockUser') || 'Block user'}
                        >
                          <Ban size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






