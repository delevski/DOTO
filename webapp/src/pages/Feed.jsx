import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, Share2, Heart, MoreHorizontal, Clock, TrendingUp, CheckCircle, Lock, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';

export default function Feed() {
  const { isLoading, error, data } = db.useQuery({ posts: {} });
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeTab, setActiveTab] = useState('nearby'); // 'nearby', 'friends', 'following', 'myPosts'
  const menuRefs = useRef({});

  const allPosts = data?.posts || [];

  // Filter and sort posts based on active tab
  const posts = React.useMemo(() => {
    let filtered = [...allPosts];

    switch (activeTab) {
      case 'myPosts':
        // Show only posts created by the current user, sorted by newest first
        filtered = filtered.filter(post => post.authorId === user?.id);
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
        // Show all posts, sorted by newest first
        filtered.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
        break;
    }

    return filtered;
  }, [allPosts, activeTab, user?.id]);

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {t('filters')}
            </button>
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
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
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
              const isClaimed = !!post.claimedBy;
              const isClaimedByMe = post.claimedBy === user?.id;
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
                <article key={post.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden transition-shadow duration-200 ${
                  isClaimed ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700 hover:shadow-md'
                }`}>
                  <div className="p-6">
                    <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex gap-3 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <img src={isMyPost ? (user?.avatar || post.avatar) : post.avatar} alt={isMyPost ? (user?.name || post.author) : post.author} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" />
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{isMyPost ? (user?.name || post.author) : post.author}</h3>
                          <div className={`flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Clock size={12} />
                            <span>{formatTime(post.timestamp)}</span>
                            <span>•</span>
                            <span className="text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">{post.tag}</span>
                          </div>
                        </div>
                      </div>
                      {isClaimed && (
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
                              <Lock size={14} />
                              {t('claimed')}
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
                    
                    <Link to={`/post/${post.id}`} className="block group mb-4">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors line-clamp-3">
                        {post.description}
                      </p>
                    </Link>
                    
                    {/* Display Images */}
                    {post.photos && post.photos.length > 0 && (
                      <div className="mb-4">
                        {post.photos.length === 1 ? (
                          // Single image - full width
                          <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                            <img
                              src={typeof post.photos[0] === 'string' ? post.photos[0] : (post.photos[0]?.preview || post.photos[0])}
                              alt={`Post image`}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
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
                          <div className="grid grid-cols-2 gap-2">
                            {post.photos.map((photo, index) => (
                              <div key={index} className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                                <img
                                  src={typeof photo === 'string' ? photo : (photo?.preview || photo)}
                                  alt={`Post image ${index + 1}`}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
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
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700 row-span-2">
                              <img
                                src={typeof post.photos[0] === 'string' ? post.photos[0] : (post.photos[0]?.preview || post.photos[0])}
                                alt={`Post image 1`}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
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
                            <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                              <img
                                src={typeof post.photos[1] === 'string' ? post.photos[1] : (post.photos[1]?.preview || post.photos[1])}
                                alt={`Post image 2`}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
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
                            <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                              {post.photos.length > 2 ? (
                                <>
                                  <img
                                    src={typeof post.photos[2] === 'string' ? post.photos[2] : (post.photos[2]?.preview || post.photos[2])}
                                    alt={`Post image 3`}
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
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
                                      <span className="text-white font-bold text-lg">+{post.photos.length - 3}</span>
                                    </div>
                                  )}
                                </>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {post.location && (
                        <div className={`flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <MapPin size={14} className="text-red-500" />
                          <span className="font-medium">{post.location}</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{post.distance}</span>
                    </div>

                    <div className={`flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button 
                          onClick={handleLike}
                          className={`flex items-center gap-2 ${isLiked ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'} hover:text-red-500 dark:hover:text-red-400 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Heart size={20} className={isLiked ? 'fill-red-500 text-red-500' : 'group-hover:fill-current'} />
                          <span className="text-sm font-medium">{likeCount}</span>
                        </button>
                        <Link to={`/post/${post.id}`} className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <MessageCircle size={20} />
                          <span className="text-sm font-medium">{post.comments || 0}</span>
                        </Link>
                        <button 
                          onClick={handleShare}
                          className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Share2 size={20} />
                        </button>
                      </div>
                      {isClaimed ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {isClaimedByMe ? t('claimedByYou') : `${t('claimed')} ${post.claimedByName || t('someone')}`}
                        </div>
                      ) : (
                        <Link 
                          to={`/post/${post.id}`}
                          className={`text-sm font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 ${
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
