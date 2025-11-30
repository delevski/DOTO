import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, Share2, Heart, MoreHorizontal, Clock, TrendingUp, CheckCircle, Lock, Edit, Trash2, Filter, X } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { getConversationId, createOrUpdateConversation } from '../utils/messaging';

export default function Feed() {
  const { user } = useAuthStore();
  const { isLoading, error, data } = db.useQuery({ 
    posts: {},
    comments: {}
  });
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeTab, setActiveTab] = useState('nearby'); // 'nearby', 'friends', 'following', 'myPosts', 'myClaim'
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    withComments: false,
    withLikes: false,
    withClaims: false,
    nearbyMe: false,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [postCoordinates, setPostCoordinates] = useState({});
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [truncatedPosts, setTruncatedPosts] = useState({});
  const menuRefs = useRef({});
  const filterMenuRef = useRef(null);
  const descriptionRefs = useRef({});

  const allPosts = data?.posts || [];
  const allComments = data?.comments || [];
  
  // Create a map of post IDs to comment counts
  const postCommentCounts = React.useMemo(() => {
    const counts = {};
    allComments.forEach(comment => {
      counts[comment.postId] = (counts[comment.postId] || 0) + 1;
    });
    return counts;
  }, [allComments]);

  // Geocode location string to coordinates
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
        return { lat, lon };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  // Calculate distance between two coordinates using Haversine formula (in km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setIsGettingLocation(false);
        
        // Geocode post locations when user location is available
        if (filters.nearbyMe) {
          geocodePostLocations();
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enable location permissions.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Geocode post locations when nearby filter is active
  const geocodePostLocations = async () => {
    if (!userLocation) return;

    const postsToGeocode = allPosts.filter(post => 
      post.location && !postCoordinates[post.id]
    );

    if (postsToGeocode.length === 0) return;

    // Geocode in batches to avoid rate limiting
    const BATCH_SIZE = 5;
    const coords = { ...postCoordinates };

    for (let i = 0; i < postsToGeocode.length; i += BATCH_SIZE) {
      const batch = postsToGeocode.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (post) => {
        if (post.location && !coords[post.id]) {
          const geocoded = await geocodeLocation(post.location);
          if (geocoded) {
            coords[post.id] = geocoded;
          }
        }
      });
      await Promise.all(batchPromises);
      
      // Update state progressively
      setPostCoordinates({ ...coords });
      
      // Delay between batches
      if (i + BATCH_SIZE < postsToGeocode.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  // Effect to geocode locations when nearby filter is enabled
  useEffect(() => {
    if (filters.nearbyMe && userLocation && allPosts.length > 0) {
      geocodePostLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.nearbyMe, userLocation, allPosts.length]);

  // Filter and sort posts based on active tab and filters
  const posts = React.useMemo(() => {
    let filtered = [...allPosts];

    // Apply tab filter
    switch (activeTab) {
      case 'myPosts':
        // Show only posts created by the current user, sorted by newest first
        filtered = filtered.filter(post => post.authorId === user?.id);
        filtered.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
        break;
      case 'myClaim':
        // Show only posts where the current user is the approved claimer
        filtered = filtered.filter(post => post.approvedClaimerId === user?.id);
        filtered.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
        break;
      case 'friends':
        // TODO: Implement friends filter when friends feature is added
        filtered = [];
        break;
      case 'following':
        // TODO: Implement following filter when following feature is added
        filtered = [];
        break;
      case 'nearby':
      default:
        // Show all posts except those with approvedClaimerId, sorted by newest first
        filtered = filtered.filter(post => !post.approvedClaimerId);
        filtered.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
        break;
    }

    // Apply multiple choice filters (withComments, withLikes, withClaims, nearbyMe)
    const activeFilters = Object.entries(filters).filter(([_, isActive]) => isActive);
    
    if (activeFilters.length > 0) {
      filtered = filtered.filter(post => {
        // If any filter is active, post must match at least one
        return activeFilters.some(([filterType, _]) => {
          switch (filterType) {
            case 'withComments':
              // Post has comments (check comment count or actual comments)
              const commentCount = postCommentCounts[post.id] || post.comments || 0;
              return commentCount > 0;
            case 'withLikes':
              // Post has likes
              const likedBy = post.likedBy || [];
              const likeCount = likedBy.length || post.likes || 0;
              return likeCount > 0;
            case 'withClaims':
              // Post has claimers
              const claimers = post.claimers || [];
              return claimers.length > 0;
            case 'nearbyMe':
              // Post is within 20km of user location
              if (!userLocation) return false;
              const postCoords = postCoordinates[post.id];
              if (!postCoords) return false; // Skip if not geocoded yet
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lon,
                postCoords.lat,
                postCoords.lon
              );
              return distance <= 20; // 20km radius
            default:
              return false;
          }
        });
      });
    }

    return filtered;
  }, [allPosts, activeTab, user?.id, filters, postCommentCounts, userLocation, postCoordinates]);

  // Debug: Log posts with photos
  useEffect(() => {
    if (posts.length > 0) {
      console.log('Posts loaded:', posts.length);
      posts.forEach((post, index) => {
        if (post.photos) {
          console.log(`Post ${index} (ID: ${post.id}) has ${post.photos.length} photos:`, post.photos);
        } else {
          console.log(`Post ${index} (ID: ${post.id}) has no photos property`);
        }
      });
    }
  }, [posts]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.values(menuRefs.current).forEach(ref => {
        if (ref && !ref.contains(event.target)) {
          setOpenMenuId(null);
        }
      });
      // Close filter menu when clicking outside
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFilter = (filterName) => {
    const newValue = !filters[filterName];
    setFilters(prev => ({
      ...prev,
      [filterName]: newValue
    }));

    // If enabling nearbyMe filter and user location is not set, get it
    if (filterName === 'nearbyMe' && newValue && !userLocation) {
      getUserLocation();
    }
  };

  const clearFilters = () => {
    setFilters({
      withComments: false,
      withLikes: false,
      withClaims: false,
      nearbyMe: false,
    });
    // Optionally clear user location when clearing filters
    // setUserLocation(null);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleDeletePost = (postId) => {
    if (window.confirm(t('areYouSureDeletePost'))) {
      db.transact(
        db.tx.posts[postId].delete()
      );
      setOpenMenuId(null);
    }
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} ${days > 1 ? t('days') : t('day')} ${t('ago')}`;
    if (hours > 0) return `${hours} ${hours > 1 ? t('hrs') : t('hr')} ${t('ago')}`;
    return t('justNow');
  };

  return (
    <div className={`max-w-7xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      {/* Header Section */}
      <div className="mb-8">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('feed')}</h1>
            <p className="text-gray-500 dark:text-gray-400">Discover tasks and help others in your neighborhood</p>
          </div>
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <TrendingUp size={16} />
              {t('topWeekly')}
            </button>
            <div className="relative" ref={filterMenuRef}>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${hasActiveFilters ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
              >
                <Filter size={16} />
                {t('filters')}
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              {showFilters && (
                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 min-w-[240px]`}>
                  <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Filter Posts</h3>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <label className={`flex items-center gap-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={filters.withComments}
                        onChange={() => toggleFilter('withComments')}
                        className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MessageCircle size={18} className="text-blue-500" />
                          <span className="font-medium text-gray-900 dark:text-white">With Comments</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Posts that have comments</p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center gap-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={filters.withLikes}
                        onChange={() => toggleFilter('withLikes')}
                        className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Heart size={18} className="text-red-500" />
                          <span className="font-medium text-gray-900 dark:text-white">With Likes</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Posts that have likes</p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center gap-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={filters.withClaims}
                        onChange={() => toggleFilter('withClaims')}
                        className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={18} className="text-green-500" />
                          <span className="font-medium text-gray-900 dark:text-white">With Claims</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Posts that have claimers</p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center gap-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={filters.nearbyMe}
                        onChange={() => toggleFilter('nearbyMe')}
                        disabled={isGettingLocation}
                        className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin size={18} className="text-red-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Nearby Me</span>
                          {isGettingLocation && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">(Getting location...)</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {userLocation ? 'Posts within 20km of your location' : 'Posts near your current location'}
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  {hasActiveFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {filters.withComments && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full flex items-center gap-1">
                            <MessageCircle size={12} />
                            Comments
                          </span>
                        )}
                        {filters.withLikes && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full flex items-center gap-1">
                            <Heart size={12} />
                            Likes
                          </span>
                        )}
                        {filters.withClaims && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
                            <CheckCircle size={12} />
                            Claims
                          </span>
                        )}
                        {filters.nearbyMe && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full flex items-center gap-1">
                            <MapPin size={12} />
                            Nearby
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-6 border-b border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={() => setActiveTab('nearby')}
            className={`pb-3 text-sm px-1 transition-colors ${
              activeTab === 'nearby'
                ? 'text-gray-900 dark:text-white font-semibold border-b-2 border-red-600'
                : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('nearby')}
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`pb-3 text-sm px-1 transition-colors ${
              activeTab === 'friends'
                ? 'text-gray-900 dark:text-white font-semibold border-b-2 border-red-600'
                : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('friends')}
          </button>
          <button 
            onClick={() => setActiveTab('following')}
            className={`pb-3 text-sm px-1 transition-colors ${
              activeTab === 'following'
                ? 'text-gray-900 dark:text-white font-semibold border-b-2 border-red-600'
                : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('following')}
          </button>
          <button 
            onClick={() => setActiveTab('myPosts')}
            className={`pb-3 text-sm px-1 transition-colors ${
              activeTab === 'myPosts'
                ? 'text-gray-900 dark:text-white font-semibold border-b-2 border-red-600'
                : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('myPosts')}
          </button>
          <button 
            onClick={() => setActiveTab('myClaim')}
            className={`pb-3 text-sm px-1 transition-colors ${
              activeTab === 'myClaim'
                ? 'text-gray-900 dark:text-white font-semibold border-b-2 border-red-600'
                : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('myClaim')}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
               <p className="text-gray-500 dark:text-gray-400 text-lg">{t('loadingPosts')}</p>
             </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <p className="text-red-500 text-lg">{t('errorLoadingPosts')} {error.message}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {activeTab === 'myPosts' 
                  ? (user ? t('noMyPosts') || 'You haven\'t created any posts yet' : t('mustBeLoggedIn'))
                  : activeTab === 'myClaim'
                  ? (user ? t('noMyClaims') || 'You haven\'t been approved for any tasks yet' : t('mustBeLoggedIn'))
                  : activeTab === 'friends'
                  ? t('noFriendsPosts') || 'No posts from friends yet'
                  : activeTab === 'following'
                  ? t('noFollowingPosts') || 'No posts from people you follow yet'
                  : t('noPostsYet')}
              </p>
              {activeTab === 'myPosts' && user && (
                <button
                  onClick={() => navigate('/new-post')}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  {t('createYourFirstPost') || 'Create Your First Post'}
                </button>
              )}
            </div>
          ) : (
            posts.map(post => {
              // Support both old (claimedBy) and new (claimers array) format for backward compatibility
              const claimers = post.claimers || [];
              const approvedClaimerId = post.approvedClaimerId || null;
              const isClaimed = approvedClaimerId !== null || (post.claimedBy && !claimers.length);
              const isClaimedByMe = approvedClaimerId === user?.id || post.claimedBy === user?.id;
              const isMyPost = post.authorId === user?.id;
              const likedBy = post.likedBy || [];
              const isLiked = user && likedBy.includes(user.id);
              const likeCount = likedBy.length || post.likes || 0;
              
              const handleLike = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) {
                  alert(t('mustBeLoggedInToLike'));
                  return;
                }

                const currentLikedBy = post.likedBy || [];
                const isCurrentlyLiked = currentLikedBy.includes(user.id);
                
                if (isCurrentlyLiked) {
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

              const handleShare = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const postUrl = `${window.location.origin}/post/${post.id}`;
                
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: post.title || t('checkOutThisPost'),
                      text: post.description,
                      url: postUrl
                    });
                  } catch (err) {
                    if (err.name !== 'AbortError') {
                      // Fallback to copy
                      try {
                        await navigator.clipboard.writeText(postUrl);
                        alert(t('linkCopiedToClipboard'));
                      } catch (copyErr) {
                        console.error('Failed to copy:', copyErr);
                      }
                    }
                  }
                } else {
                  // Fallback to copy
                  try {
                    await navigator.clipboard.writeText(postUrl);
                    alert(t('linkCopiedToClipboard'));
                  } catch (copyErr) {
                    console.error('Failed to copy:', copyErr);
                  }
                }
              };

              return (
                <article key={post.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition-shadow duration-200 ${
                  approvedClaimerId ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700 hover:shadow-md'
                }`} style={{ contain: 'content' }}>
                  <div className="p-4">
                    <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex gap-2.5 items-center flex-1 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <img src={isMyPost ? (user?.avatar || post.avatar) : post.avatar} alt={isMyPost ? (user?.name || post.author) : post.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700 flex-shrink-0" loading="lazy" decoding="async" />
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{isMyPost ? (user?.name || post.author) : post.author}</h3>
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
                                className="flex-shrink-0 p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={t('sendMessage')}
                              >
                                <MessageCircle size={16} />
                              </button>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Clock size={12} />
                            <span>{formatTime(post.timestamp)}</span>
                            <span>•</span>
                            <span className="text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">{post.tag}</span>
                          </div>
                        </div>
                      </div>
                      {approvedClaimerId && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${isRTL ? 'flex-row-reverse' : ''} ${
                          isClaimedByMe 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {isClaimedByMe ? (
                            <>
                              <CheckCircle size={14} />
                              {t('claimedByYou')}
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              {t('approved')}
                            </>
                          )}
                        </div>
                      )}
                      {isMyPost && (
                        <div className={`relative ${isRTL ? 'order-first' : ''}`} ref={el => menuRefs.current[post.id] = el}>
                          <button 
                            onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          {openMenuId === post.id && (
                            <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]`}>
                              <button
                                onClick={() => {
                                  navigate(`/post/${post.id}?edit=true`);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Edit size={16} />
                                {t('edit')}
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 size={16} />
                                {t('delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <Link to={`/post/${post.id}`} className="block group">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {post.title}
                        </h4>
                      </Link>
                      <div className="relative">
                        <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap ${expandedDescriptions[post.id] ? '' : 'line-clamp-3'}`}>
                          {post.description}
                        </p>
                        {post.description && (post.description.length > 100 || (post.description.match(/\n/g) || []).length >= 3) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedDescriptions(prev => ({
                                ...prev,
                                [post.id]: !prev[post.id]
                              }));
                            }}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-1"
                          >
                            {expandedDescriptions[post.id] ? t('showLess') || 'Show less' : t('readMore') || 'Read more'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Claimers Avatars */}
                    {claimers.length > 0 && (
                      <div className={`mb-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {claimers.slice(0, 4).map((claimer, index) => (
                            <img
                              key={claimer.userId}
                              src={claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}`}
                              alt={claimer.userName}
                              className={`w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 object-cover ${isRTL ? 'mr-[-4px]' : 'ml-[-4px]'}`}
                              style={{ zIndex: claimers.length - index }}
                              title={claimer.userName}
                              loading="lazy"
                              decoding="async"
                            />
                          ))}
                          {claimers.length > 4 && (
                            <div className={`w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 ${isRTL ? 'mr-[-4px]' : 'ml-[-4px]'}`} style={{ zIndex: 0 }}>
                              +{claimers.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {claimers.length} {claimers.length === 1 ? 'claimer' : 'claimers'}
                        </span>
                      </div>
                    )}
                    
                    {/* Display Images */}
                    {post.photos && post.photos.length > 0 && (
                      <div className="mb-3">
                        {post.photos.length === 1 ? (
                          // Single image - show full image
                          <div className="relative w-full max-h-48 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
                            <img
                              src={typeof post.photos[0] === 'string' ? post.photos[0] : (post.photos[0]?.preview || post.photos[0])}
                              alt={`Post image`}
                              className="max-w-full max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity duration-300"
                              loading="lazy"
                              decoding="async"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/post/${post.id}`);
                              }}
                              onError={(e) => {
                                console.error('Failed to load image in feed:', post.photos[0], 'Post ID:', post.id);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : post.photos.length === 2 ? (
                          // Two images - side by side
                          <div className="grid grid-cols-2 gap-1.5">
                            {post.photos.map((photo, index) => (
                              <div key={index} className="relative h-32 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
                                <img
                                  src={typeof photo === 'string' ? photo : (photo?.preview || photo)}
                                  alt={`Post image ${index + 1}`}
                                  className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity duration-300"
                                  loading="lazy"
                                  decoding="async"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/post/${post.id}`);
                                  }}
                                  onError={(e) => {
                                    console.error('Failed to load image in feed:', photo, 'Post ID:', post.id);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Three or more images - grid with overlay
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="relative h-28 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
                              <img
                                src={typeof post.photos[0] === 'string' ? post.photos[0] : (post.photos[0]?.preview || post.photos[0])}
                                alt={`Post image 1`}
                                className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity duration-300"
                                loading="lazy"
                                decoding="async"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/post/${post.id}`);
                                }}
                                onError={(e) => {
                                  console.error('Failed to load image in feed:', post.photos[0], 'Post ID:', post.id);
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="relative h-28 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
                              <img
                                src={typeof post.photos[1] === 'string' ? post.photos[1] : (post.photos[1]?.preview || post.photos[1])}
                                alt={`Post image 2`}
                                className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity duration-300"
                                loading="lazy"
                                decoding="async"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/post/${post.id}`);
                                }}
                                onError={(e) => {
                                  console.error('Failed to load image in feed:', post.photos[1], 'Post ID:', post.id);
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="relative h-28 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
                              {post.photos.length > 2 ? (
                                <>
                                  <img
                                    src={typeof post.photos[2] === 'string' ? post.photos[2] : (post.photos[2]?.preview || post.photos[2])}
                                    alt={`Post image 3`}
                                    className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity duration-300"
                                    loading="lazy"
                                    decoding="async"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigate(`/post/${post.id}`);
                                    }}
                                    onError={(e) => {
                                      console.error('Failed to load image in feed:', post.photos[2], 'Post ID:', post.id);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  {post.photos.length > 3 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/post/${post.id}`);
                                      }}
                                    >
                                      <span className="text-white font-bold text-sm">+{post.photos.length - 3}</span>
                                    </div>
                                  )}
                                </>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {post.location && (
                        <div className={`flex items-center gap-1 text-gray-600 dark:text-gray-400 text-xs bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <MapPin size={12} className="text-red-500" />
                          <span className="font-medium truncate max-w-[120px]">{post.location}</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{post.distance}</span>
                    </div>

                    <div className={`flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button 
                          onClick={handleLike}
                          className={`flex items-center gap-1.5 ${isLiked ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'} hover:text-red-500 dark:hover:text-red-400 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Heart size={18} className={isLiked ? 'fill-red-500 text-red-500' : 'group-hover:fill-current'} />
                          <span className="text-xs font-medium">{likeCount}</span>
                        </button>
                        <Link to={`/post/${post.id}`} className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <MessageCircle size={18} />
                          <span className="text-xs font-medium">{post.comments || 0}</span>
                        </Link>
                        <button 
                          onClick={handleShare}
                          className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                      {approvedClaimerId ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {isClaimedByMe ? t('claimedByYou') : t('approved')}
                        </div>
                      ) : claimers.length > 0 ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {claimers.length} {claimers.length === 1 ? 'claimer' : 'claimers'}
                        </div>
                      ) : (
                        <Link 
                          to={`/post/${post.id}`}
                          className={`text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 ${
                            isMyPost 
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                              : 'bg-gray-900 dark:bg-gray-700 text-white dark:text-white hover:bg-gray-800 dark:hover:bg-gray-600'
                          }`}
                          onClick={(e) => {
                            if (isMyPost) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {isMyPost ? t('yourPost') : t('claimTask')}
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Weekly Widget */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className={`font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp size={18} className="text-red-600" />
              {t('topWeekly')}
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">{t('communityEvent')}{i}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">12 {t('peopleJoining')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Widget */}
          <div className="bg-gradient-to-br from-red-600 to-rose-500 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="font-bold text-lg mb-4">{t('yourImpact')}</h3>
            <div className="space-y-4">
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">{t('tasksCompleted')}</span>
                <span className="font-bold text-xl">24</span>
              </div>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">{t('angelRating')}</span>
                <span className="font-bold text-xl">4.9 ⭐</span>
              </div>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">{t('badgesEarned')}</span>
                <span className="font-bold text-xl">8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
