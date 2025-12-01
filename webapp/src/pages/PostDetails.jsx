import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Share2, MessageCircle, Heart, Star, CheckCircle, Lock, AlertCircle, MoreHorizontal, Edit, Trash2, Save, X, Image, Send, Copy, UserPlus, Award, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';
import { ISRAEL_CENTER, ISRAEL_BOUNDS, validateIsraelBounds } from '../utils/israelBounds';
import { getConversationId, createOrUpdateConversation } from '../utils/messaging';
import { updateUserStreak } from '../utils/streakTracking';
import { useOtherUserStats } from '../hooks/useUserStats';

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

// Geocode location string to coordinates using Nominatim (restricted to Israel)
const geocodeLocation = async (locationString) => {
  if (!locationString || locationString.trim() === '') return null;
  
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: locationString,
      limit: '1',
      countrycodes: 'il',
      bounded: '1',
      viewbox: '34.2,33.5,35.9,29.4',
      addressdetails: '1'
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'DOTO-App/1.0'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      if (lat >= 29.4 && lat <= 33.5 && lon >= 34.2 && lon <= 35.9) {
        return [lat, lon];
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
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

export default function PostDetails() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const menuRef = useRef(null);
  
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [showMenu, setShowMenu] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    timeframe: ''
  });
  const [editPhotos, setEditPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const [newComment, setNewComment] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef(null);
  const [postCoordinates, setPostCoordinates] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Fetch post and comments from InstantDB
  const { isLoading, error, data } = db.useQuery({ 
    posts: { 
      $: { 
        where: { id: postId } 
      } 
    },
    comments: {
      $: {
        where: { postId: postId }
      }
    }
  });
  
  const post = data?.posts?.[0];
  const comments = data?.comments || [];

  // Get author stats for the "About Author" section
  const authorStats = useOtherUserStats(post?.authorId);

  useEffect(() => {
    if (!isLoading && !error && !post) {
      navigate('/feed');
    }
  }, [post, isLoading, error, navigate]);

  // Geocode post location when post loads
  useEffect(() => {
    if (post?.location) {
      geocodeLocation(post.location).then(coords => {
        if (coords) {
          setPostCoordinates(coords);
        } else {
          setPostCoordinates(ISRAEL_CENTER);
        }
      });
    } else {
      setPostCoordinates(ISRAEL_CENTER);
    }
  }, [post?.location]);

  // Initialize edit form when post loads or edit mode is enabled
  useEffect(() => {
    if (post && isEditing) {
      setEditForm({
        title: post.title || '',
        description: post.description || '',
        location: post.location || '',
        category: post.category || '',
        timeframe: post.timeframe || ''
      });
      // Convert photo URLs to objects with preview property for consistency
      setEditPhotos((post.photos || []).map(photo => 
        typeof photo === 'string' ? photo : photo.preview || photo
      ));
    }
  }, [post?.id, isEditing]); // Only re-initialize when post ID changes or edit mode toggles

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (error || !post) {
    return null; // Handled by useEffect
  }

  // Support both old (claimedBy) and new (claimers array) format for backward compatibility
  const claimers = post.claimers || [];
  const approvedClaimerId = post.approvedClaimerId || null;
  const isClaimed = approvedClaimerId !== null || (post.claimedBy && !claimers.length);
  const isClaimedByMe = approvedClaimerId === user?.id || post.claimedBy === user?.id;
  const hasClaimed = user && claimers.some(c => c.userId === user.id);
  const isMyPost = post.authorId === user?.id;
  const likedBy = post.likedBy || [];
  const isLiked = user && likedBy.includes(user.id);
  const likeCount = likedBy.length || post.likes || 0;
  
  // Completion status
  const completedByClaimer = post.completedByClaimer || false;
  const completedByAuthor = post.completedByAuthor || false;
  const isCompleted = post.isCompleted || false;
  const helperRating = post.helperRating || null;

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleClaim = async () => {
    setLocalError('');
    setLocalSuccess('');

    if (isMyPost) {
      setLocalError('You cannot claim your own post');
      return;
    }

    if (approvedClaimerId) {
      setLocalError('This post already has an approved claimer');
      return;
    }

    if (!user) {
      setLocalError('You must be logged in to claim a post');
      return;
    }

    // Check if user already claimed
    if (hasClaimed) {
      setLocalError('You have already claimed this post');
      return;
    }

    try {
      const newClaimer = {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || 'https://i.pravatar.cc/150?u=' + user.id,
        claimedAt: Date.now()
      };

      db.transact(
        db.tx.posts[postId].update({
          claimers: [...claimers, newClaimer]
        })
      );
      
      // Update user's activity streak
      updateUserStreak(user.id);
      
      setLocalSuccess('Post claimed successfully! The poster will review your claim.');
    } catch (err) {
      setLocalError(err.message || 'Failed to claim post. Please try again.');
    }
  };

  const handleApproveClaimer = async (claimerUserId) => {
    setLocalError('');
    setLocalSuccess('');

    if (!isMyPost) {
      setLocalError('Only the poster can approve claimers');
      return;
    }

    if (approvedClaimerId) {
      setLocalError('A claimer has already been approved');
      return;
    }

    try {
      const notificationId = id();
      const approvedClaimer = claimers.find(c => c.userId === claimerUserId);
      
      if (!post) {
        setLocalError('Post not found');
        return;
      }

      const now = Date.now();
      
      // Prepare notification data - keep IDs as-is (same format as used in transaction)
      const notificationData = {
        id: notificationId,
        userId: claimerUserId,
        postId: postId,
        type: 'claimer_approved',
        message: t('youWereApproved'),
        read: false,
        timestamp: now,
        postTitle: post.title || t('helpNeeded'),
        createdAt: now
      };

      console.log('=== APPROVING CLAIMER ===');
      console.log('Post ID:', postId);
      console.log('Claimer User ID:', claimerUserId);
      console.log('Notification ID:', notificationId);
      console.log('Notification data:', JSON.stringify(notificationData, null, 2));
      
      // Update post first
      await db.transact(
        db.tx.posts[postId].update({
          approvedClaimerId: claimerUserId,
          claimedBy: claimerUserId,
          claimedByName: approvedClaimer?.userName || 'Someone'
        })
      );
      
      console.log('Post updated successfully');
      
      // Create notification separately to ensure it's created
      await db.transact(
        db.tx.notifications[notificationId].update(notificationData)
      );
      
      console.log('Notification created successfully');
      console.log('=== APPROVAL COMPLETE ===');
      
      setLocalSuccess('Claimer approved successfully!');
    } catch (err) {
      console.error('Error approving claimer:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setLocalError(err.message || 'Failed to approve claimer. Please try again.');
    }
  };

  const handleLike = () => {
    if (!user) {
      setLocalError('You must be logged in to like a post');
      return;
    }

    const currentLikedBy = post.likedBy || [];
    const isCurrentlyLiked = currentLikedBy.includes(user.id);
    
    if (isCurrentlyLiked) {
      // Unlike: remove user from likedBy array
      db.transact(
        db.tx.posts[postId].update({
          likedBy: currentLikedBy.filter(id => id !== user.id),
          likes: Math.max(0, (post.likes || 0) - 1)
        })
      );
    } else {
      // Like: add user to likedBy array
      db.transact(
        db.tx.posts[postId].update({
          likedBy: [...currentLikedBy, user.id],
          likes: (post.likes || 0) + 1
        })
      );
    }
  };

  const handleAddComment = () => {
    if (!user) {
      setLocalError('You must be logged in to comment');
      return;
    }

    if (!newComment.trim()) {
      setLocalError('Please enter a comment');
      return;
    }

    const commentId = id();
    const comment = {
      id: commentId,
      postId: postId,
      authorId: user.id,
      author: user.name,
      avatar: user.avatar,
      text: newComment.trim(),
      timestamp: Date.now(),
      createdAt: Date.now()
    };

    db.transact(
      db.tx.comments[commentId].update(comment),
      db.tx.posts[postId].update({
        comments: (post.comments || 0) + 1
      })
    );

    // Update user's activity streak
    updateUserStreak(user.id);

    setNewComment('');
  };

  const handleDeleteComment = (commentId) => {
    if (!user) return;
    
    const comment = comments.find(c => c.id === commentId);
    if (comment && (comment.authorId === user.id || isMyPost)) {
      if (window.confirm('Are you sure you want to delete this comment?')) {
        db.transact(
          db.tx.comments[commentId].delete(),
          db.tx.posts[postId].update({
            comments: Math.max(0, (post.comments || 0) - 1)
          })
        );
      }
    }
  };

  const handleShare = async (type) => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(postUrl);
        setLocalSuccess('Link copied to clipboard!');
        setShowShareMenu(false);
        setTimeout(() => setLocalSuccess(''), 2000);
      } catch (err) {
        setLocalError('Failed to copy link');
      }
    } else if (type === 'native') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: post.title || 'Check out this post',
            text: post.description,
            url: postUrl
          });
          setShowShareMenu(false);
        } catch (err) {
          if (err.name !== 'AbortError') {
            setLocalError('Failed to share');
          }
        }
      } else {
        // Fallback to copy if share API not available
        handleShare('copy');
      }
    }
  };

  // Handle claimer marking task as complete
  const handleClaimerMarkComplete = async () => {
    setLocalError('');
    setLocalSuccess('');

    if (!isClaimedByMe) {
      setLocalError('Only the approved claimer can mark this task as complete');
      return;
    }

    try {
      await db.transact(
        db.tx.posts[postId].update({
          completedByClaimer: true
        })
      );
      
      // Create notification for the post author
      const notificationId = id();
      await db.transact(
        db.tx.notifications[notificationId].update({
          id: notificationId,
          userId: post.authorId,
          postId: postId,
          type: 'task_marked_complete',
          message: t('claimerMarkedComplete') || 'The helper has marked the task as complete',
          read: false,
          timestamp: Date.now(),
          postTitle: post.title || t('helpNeeded'),
          createdAt: Date.now()
        })
      );
      
      // Update user's activity streak
      updateUserStreak(user.id);
      
      setLocalSuccess('You marked this task as complete! Waiting for the poster to confirm.');
    } catch (err) {
      console.error('Error marking task complete:', err);
      setLocalError(err.message || 'Failed to mark task as complete. Please try again.');
    }
  };

  // Handle author confirming task completion (opens rating modal)
  const handleAuthorConfirmComplete = () => {
    setShowRatingModal(true);
    setSelectedRating(0);
    setHoverRating(0);
  };

  // Handle submitting the rating and completing the task
  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      setLocalError('Please select a rating for the helper');
      return;
    }

    setIsSubmittingRating(true);
    setLocalError('');

    try {
      const now = Date.now();
      
      // Update post with completion status and rating
      await db.transact(
        db.tx.posts[postId].update({
          completedByAuthor: true,
          isCompleted: true,
          completedAt: now,
          helperRating: selectedRating
        })
      );

      // Create notification for the helper
      const notificationId = id();
      await db.transact(
        db.tx.notifications[notificationId].update({
          id: notificationId,
          userId: approvedClaimerId,
          postId: postId,
          type: 'task_completed',
          message: t('taskCompletedNotification') || `Task completed! You received a ${selectedRating}-star rating.`,
          read: false,
          timestamp: now,
          postTitle: post.title || t('helpNeeded'),
          rating: selectedRating,
          createdAt: now
        })
      );

      // Update user's activity streak (author confirming)
      updateUserStreak(user.id);

      setShowRatingModal(false);
      setLocalSuccess('Task completed and helper rated! Thank you for using DOTO.');
    } catch (err) {
      console.error('Error completing task:', err);
      setLocalError(err.message || 'Failed to complete task. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
    // Remove edit query param from URL
    navigate(`/post/${postId}`, { replace: true });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      title: post.title || '',
      description: post.description || '',
      location: post.location || '',
      category: post.category || '',
      timeframe: post.timeframe || ''
    });
    setEditPhotos((post.photos || []).map(photo => 
      typeof photo === 'string' ? photo : photo.preview || photo
    ));
  };

  const handleSaveEdit = async () => {
    setLocalError('');
    setLocalSuccess('');

    if (!post) {
      setLocalError('Post not found');
      return;
    }

    if (!editForm.description.trim()) {
      setLocalError('Please enter a description');
      return;
    }

    if (!editForm.location.trim()) {
      setLocalError('Please enter a location');
      return;
    }

    if (!isMyPost) {
      setLocalError('You can only edit your own posts');
      return;
    }

    try {
      // Convert photo objects to URLs (keep existing URLs as-is)
      const photoUrls = editPhotos.map(photo => 
        typeof photo === 'string' ? photo : (photo.preview || photo)
      );
      
      console.log('Updating post:', postId, {
        title: editForm.title.trim() || 'Help Needed',
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        category: editForm.category || 'Other',
        tag: editForm.category || 'Other',
        timeframe: editForm.timeframe || null,
        photos: photoUrls
      });
      
      db.transact(
        db.tx.posts[postId].update({
          title: editForm.title.trim() || 'Help Needed',
          description: editForm.description.trim(),
          location: editForm.location.trim(),
          category: editForm.category || 'Other',
          tag: editForm.category || 'Other',
          timeframe: editForm.timeframe || null,
          photos: photoUrls
        })
      );
      
      console.log('Update transaction sent');
      
      setLocalSuccess('Post updated successfully!');
      setIsEditing(false);
      setTimeout(() => {
        setLocalSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error updating post:', err);
      setLocalError(err.message || 'Failed to update post. Please try again.');
    }
  };

  const handleDeletePost = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      db.transact(
        db.tx.posts[postId].delete()
      );
      navigate('/feed');
    }
    setShowMenu(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Convert files to base64 data URLs for persistence
    const newPhotos = await Promise.all(
      files.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              file,
              preview: reader.result, // Base64 data URL
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );
    
    setEditPhotos([...editPhotos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const newPhotos = editPhotos.filter((_, i) => i !== index);
    setEditPhotos(newPhotos);
  };

  return (
    <div className={`max-w-5xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <button 
        onClick={() => navigate(-1)} 
        className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft size={20} className={`${isRTL ? 'rtl-flip group-hover:translate-x-1' : 'group-hover:-translate-x-1'} transition-transform`} />
        <span className="font-medium">{t('back')} to {t('feed')}</span>
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
          {/* Post Card */}
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden ${
            approvedClaimerId ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700'
          }`}>
            <div className="p-8">
              {/* Author Header */}
              <div className={`flex items-start justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex gap-4 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={isMyPost ? (user?.avatar || post.avatar) : post.avatar} alt={isMyPost ? (user?.name || post.author) : post.author} className="w-16 h-16 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-700" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isMyPost ? (user?.name || post.author) : post.author}</h2>
                    <div className={`flex items-center gap-3 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Star size={16} className="text-yellow-400 fill-current" />
                        <span className="font-semibold">4.8</span>
                        <span className="text-gray-400 dark:text-gray-500">(24 reviews)</span>
                      </div>
                      <span className="text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{formatTime(post.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {approvedClaimerId && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${isRTL ? 'flex-row-reverse' : ''} ${
                      isClaimedByMe 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {isClaimedByMe ? (
                        <>
                          <CheckCircle size={16} />
                          {t('claimedByYou')}
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          {t('approved')}
                        </>
                      )}
                    </div>
                  )}
                  {isMyPost && (
                    <div className="relative" ref={menuRef}>
                      <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {showMenu && (
                        <div className="absolute end-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                          <button
                            onClick={handleEdit}
                            className={`w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                          <button
                            onClick={handleDeletePost}
                            className={`w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              {isEditing ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      className="w-full p-3 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                    <textarea
                      className="w-full p-3 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all min-h-[120px]"
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location *</label>
                    <input
                      type="text"
                      className="w-full p-3 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={editForm.location}
                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                    <input
                      type="text"
                      className="w-full p-3 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={editForm.category}
                      onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Photos</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                    >
                      <Image size={20} />
                      <span className="font-medium">Add Photos</span>
                    </button>
                    {editPhotos.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {editPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={typeof photo === 'string' ? photo : photo.preview}
                              alt={`Edit ${index + 1}`}
                              className="w-full h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute top-2 end-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg mb-6">{post.description}</p>
                  
                  {/* Claimers Avatars */}
                  {claimers.length > 0 && (
                    <div className={`mb-6 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{claimers.length} {claimers.length === 1 ? 'claimer' : 'claimers'}:</span>
                      <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {claimers.slice(0, 5).map((claimer, index) => (
                          <img
                            key={claimer.userId}
                            src={claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}`}
                            alt={claimer.userName}
                            className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 object-cover -ms-2 first:ms-0"
                            style={{ zIndex: claimers.length - index }}
                            title={claimer.userName}
                          />
                        ))}
                        {claimers.length > 5 && (
                          <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 -ms-2" style={{ zIndex: 0 }}>
                            +{claimers.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Display Images */}
                  {post.photos && post.photos.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {post.photos.map((photo, index) => {
                        const photoUrl = typeof photo === 'string' ? photo : (photo?.preview || photo);
                        return (
                          <div key={index} className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                            <img
                              src={photoUrl}
                              alt={`Post image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Failed to load image:', photoUrl);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Location & Time Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 space-y-3 mb-6">
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <MapPin size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{post.location}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{post.distance}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Clock size={20} className="text-blue-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Expires in 24h</span>
                </div>
              </div>

              {/* Map Preview */}
              {postCoordinates && (
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6 overflow-hidden relative">
                  <MapContainer 
                    center={postCoordinates} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    dragging={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                  >
                    <MapBoundsEnforcer />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={postCoordinates}>
                      <Popup>
                        {post.location || 'Location'}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              )}

              {/* Actions */}
              <div className={`flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 ${isLiked ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'} hover:text-red-500 dark:hover:text-red-400 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Heart size={22} className={isLiked ? 'fill-red-500 text-red-500' : 'group-hover:fill-current'} />
                    <span className="font-medium">{likeCount}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const commentSection = document.getElementById('comments-section');
                      commentSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      document.getElementById('comment-input')?.focus();
                    }}
                    className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <MessageCircle size={22} />
                    <span className="font-medium">Comment ({comments.length})</span>
                  </button>
                  <div className="relative" ref={shareMenuRef}>
                    <button 
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Share2 size={22} />
                      <span className="font-medium">Share</span>
                    </button>
                    {showShareMenu && (
                      <div className="absolute end-0 top-10 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                        {navigator.share && (
                          <button
                            onClick={() => handleShare('native')}
                            className={`w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Share2 size={16} />
                            Share via...
                          </button>
                        )}
                        <button
                          onClick={() => handleShare('copy')}
                          className={`w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Copy size={16} />
                          Copy Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div id="comments-section" className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Comments ({comments.length})</h3>
            
            {/* Add Comment Form */}
            {user && (
              <div className={`mb-6 pb-6 border-b border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={user.avatar || 'https://i.pravatar.cc/150?u=user'} alt={user.name} className="w-10 h-10 rounded-full flex-shrink-0" />
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
                      className="flex-1 px-4 py-2 text-gray-900 dark:text-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No comments yet. Be the first to comment!</p>
              ) : (
                comments
                  .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                  .map(comment => {
                    const isCommentOwner = comment.authorId === user?.id;
                    const canDelete = isCommentOwner || isMyPost;
                    
                    const isCommentByCurrentUser = comment.authorId === user?.id;
                    const displayAvatar = isCommentByCurrentUser ? (user?.avatar || comment.avatar) : (comment.avatar || `https://i.pravatar.cc/150?u=${comment.authorId}`);
                    const displayName = isCommentByCurrentUser ? (user?.name || comment.author) : comment.author;
                    
                    return (
                      <div key={comment.id} className={`flex gap-4 group ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <img src={displayAvatar} alt={displayName} className="w-10 h-10 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="font-semibold text-gray-900 dark:text-white">{displayName}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(comment.timestamp)}</span>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="ms-auto opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">{comment.text}</p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Claim Card */}
          <div className={`rounded-2xl shadow-xl p-8 text-white sticky top-8 ${
            isCompleted
              ? 'bg-gradient-to-br from-green-600 to-emerald-500'
              : approvedClaimerId 
                ? 'bg-gradient-to-br from-gray-600 to-gray-700' 
                : 'bg-gradient-to-br from-red-600 to-rose-500'
          }`}>
            {isCompleted ? (
              // Task is fully completed
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Award size={24} />
                  <h3 className="text-2xl font-bold">{t('taskCompleted') || 'Task Completed'}</h3>
                </div>
                {(() => {
                  const approvedClaimer = claimers.find(c => c.userId === approvedClaimerId);
                  return (
                    <div className="space-y-4">
                      <p className="text-green-100">
                        {isClaimedByMe 
                          ? t('youCompletedTask') || 'Great job! You completed this task!' 
                          : isMyPost 
                            ? t('taskWasCompleted') || 'This task has been completed!'
                            : `${approvedClaimer?.userName || 'Someone'} completed this task.`}
                      </p>
                      {approvedClaimer && (
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">
                          <img 
                            src={approvedClaimer.userAvatar || `https://i.pravatar.cc/150?u=${approvedClaimer.userId}`} 
                            alt={approvedClaimer.userName}
                            className="w-12 h-12 rounded-full border-2 border-white/30"
                          />
                          <div className="flex-1">
                            <div className="font-semibold">{approvedClaimer.userName}</div>
                            <div className="text-sm text-green-200">{t('taskHelper') || 'Task Helper'}</div>
                          </div>
                          {helperRating && (
                            <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                              <Star size={16} className="text-yellow-300 fill-current" />
                              <span className="font-semibold">{helperRating}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-green-400/30">
                        <div className="flex justify-between items-center">
                          <span className="text-green-100">{t('completedOn') || 'Completed on'}</span>
                          <span className="font-semibold">
                            {post.completedAt ? new Date(post.completedAt).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : approvedClaimerId ? (
              // Task has an approved claimer but not completed
              <>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle size={24} />
                  <h3 className="text-2xl font-bold">{t('approved') || 'Approved'}</h3>
                </div>
                {(() => {
                  const approvedClaimer = claimers.find(c => c.userId === approvedClaimerId);
                  return (
                    <div className="space-y-4">
                      <p className="text-gray-200">
                        {isClaimedByMe 
                          ? t('youAreApprovedHelper') || 'You are the approved helper for this task!' 
                          : `${approvedClaimer?.userName || 'Someone'} is helping with this task.`}
                      </p>
                      {approvedClaimer && (
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">
                          <img 
                            src={approvedClaimer.userAvatar || `https://i.pravatar.cc/150?u=${approvedClaimer.userId}`} 
                            alt={approvedClaimer.userName}
                            className="w-12 h-12 rounded-full border-2 border-white/30"
                          />
                          <div>
                            <div className="font-semibold">{approvedClaimer.userName}</div>
                            <div className="text-sm text-gray-300">{t('approvedHelper') || 'Approved helper'}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Completion Status Section */}
                      <div className="mt-4 pt-4 border-t border-gray-500/30">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle2 size={18} />
                          {t('completionStatus') || 'Completion Status'}
                        </h4>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${completedByClaimer ? 'bg-green-500' : 'bg-white/20'}`}>
                              {completedByClaimer && <CheckCircle size={14} />}
                            </div>
                            <span className={completedByClaimer ? 'text-green-300' : 'text-gray-300'}>
                              {t('helperMarkedComplete') || 'Helper marked complete'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${completedByAuthor ? 'bg-green-500' : 'bg-white/20'}`}>
                              {completedByAuthor && <CheckCircle size={14} />}
                            </div>
                            <span className={completedByAuthor ? 'text-green-300' : 'text-gray-300'}>
                              {t('posterConfirmed') || 'Poster confirmed'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        {isClaimedByMe && !completedByClaimer && (
                          <button
                            onClick={handleClaimerMarkComplete}
                            className="w-full bg-white text-gray-700 font-bold py-3 rounded-xl shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={20} />
                            {t('markAsComplete') || 'Mark as Complete'}
                          </button>
                        )}
                        
                        {isClaimedByMe && completedByClaimer && !completedByAuthor && (
                          <div className="bg-white/10 p-3 rounded-xl text-center">
                            <p className="text-sm text-gray-300">
                              {t('waitingForPosterConfirm') || 'Waiting for the poster to confirm completion'}
                            </p>
                          </div>
                        )}
                        
                        {isMyPost && completedByClaimer && !completedByAuthor && (
                          <button
                            onClick={handleAuthorConfirmComplete}
                            className="w-full bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Star size={20} />
                            {t('confirmAndRate') || 'Confirm & Rate Helper'}
                          </button>
                        )}
                        
                        {isMyPost && !completedByClaimer && (
                          <div className="bg-white/10 p-3 rounded-xl text-center">
                            <p className="text-sm text-gray-300">
                              {t('waitingForHelperComplete') || 'Waiting for the helper to mark task as complete'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold mb-2">Claim This Task</h3>
                <p className="text-red-50 mb-6">Help {isMyPost ? (user?.name || post.author) : post.author} and earn rewards!</p>
                {isMyPost ? (
                  <>
                    {claimers.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-white/10 p-4 rounded-xl">
                          <h4 className="font-semibold mb-3 text-lg">Choose a Claimer ({claimers.length})</h4>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {claimers.map((claimer) => (
                              <div key={claimer.userId} className="bg-white/10 p-3 rounded-lg flex items-center gap-3">
                                <img 
                                  src={claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}`} 
                                  alt={claimer.userName}
                                  className="w-10 h-10 rounded-full border-2 border-white/30"
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{claimer.userName}</div>
                                  <div className="text-xs text-gray-300">{formatTime(claimer.claimedAt)}</div>
                                </div>
                                <button
                                  onClick={() => handleApproveClaimer(claimer.userId)}
                                  className="px-4 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
                                >
                                  Approve
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/20 p-4 rounded-xl text-center text-red-50">
                        <p className="font-medium">No claimers yet</p>
                        <p className="text-sm mt-1">Wait for people to claim your task</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {hasClaimed ? (
                      <div className="bg-white/20 p-4 rounded-xl text-center text-red-50 mb-6">
                        <p className="font-medium">You've claimed this task</p>
                        <p className="text-sm mt-1">Waiting for approval from the poster</p>
                      </div>
                    ) : (
                      <button 
                        onClick={handleClaim}
                        disabled={approvedClaimerId !== null}
                        className="w-full bg-white text-red-600 font-bold py-4 rounded-xl shadow-lg hover:bg-gray-50 transition-colors text-lg mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Claim Now
                      </button>
                    )}
                    {claimers.length > 0 && (
                      <div className="mb-6">
                        <p className="text-red-100 text-sm mb-2">{claimers.length} {claimers.length === 1 ? 'person has' : 'people have'} claimed this task</p>
                        <div className="flex flex-wrap gap-2">
                          {claimers.map((claimer) => (
                            <img
                              key={claimer.userId}
                              src={claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}`}
                              alt={claimer.userName}
                              className="w-8 h-8 rounded-full border-2 border-white/30"
                              title={claimer.userName}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-6 border-t border-red-400/30">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-red-100">Estimated Time</span>
                        <span className="font-bold">1-2 hours</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-red-100">Reward Points</span>
                        <span className="font-bold">+50 pts</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Author Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">About {isMyPost ? (user?.name || post.author) : post.author}</h3>
            <div className="space-y-3">
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600 dark:text-gray-400">{t('tasksPosted') || 'Tasks Posted'}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {authorStats.isLoading ? '...' : authorStats.postsCreated}
                </span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600 dark:text-gray-400">{t('tasksCompleted')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {authorStats.isLoading ? '...' : authorStats.tasksCompleted}
                </span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600 dark:text-gray-400">{t('angelRating')}</span>
                <span className="font-semibold flex items-center gap-1 text-gray-900 dark:text-white">
                  {authorStats.isLoading ? '...' : (
                    authorStats.averageRating > 0 ? (
                      <>{authorStats.averageRating} <Star size={14} className="text-yellow-400 fill-current" /></>
                    ) : '-'
                  )}
                </span>
              </div>
            </div>
            {!isMyPost && user && (
              <button 
                onClick={() => {
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
                  
                  navigate(`/messages?conversation=${conversationId}`);
                }}
                className="w-full mt-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                {t('sendMessage')}
              </button>
            )}
            <button className="w-full mt-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              View Profile
            </button>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('rateTheHelper') || 'Rate the Helper'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('howWasYourExperience') || 'How was your experience with this helper?'}
              </p>
            </div>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setSelectedRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={`transition-colors ${
                      star <= (hoverRating || selectedRating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            {selectedRating > 0 && (
              <p className="text-center text-gray-700 dark:text-gray-300 mb-6 font-medium">
                {selectedRating === 5 && (t('excellentRating') || 'Excellent! ⭐')}
                {selectedRating === 4 && (t('greatRating') || 'Great! 👍')}
                {selectedRating === 3 && (t('goodRating') || 'Good 👌')}
                {selectedRating === 2 && (t('fairRating') || 'Fair 😐')}
                {selectedRating === 1 && (t('poorRating') || 'Poor 😔')}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedRating(0);
                  setHoverRating(0);
                }}
                disabled={isSubmittingRating}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={selectedRating === 0 || isSubmittingRating}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmittingRating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('submitting') || 'Submitting...'}
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    {t('submitRating') || 'Submit Rating'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
