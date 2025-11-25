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
  const menuRefs = useRef({});

  const posts = data?.posts || [];

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
    if (window.confirm('Are you sure you want to delete this post?')) {
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
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
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
              Filters
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-6 border-b border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button className="text-gray-900 dark:text-white font-semibold border-b-2 border-red-600 pb-3 text-sm px-1">{t('nearby')}</button>
          <button className="text-gray-500 dark:text-gray-400 font-medium pb-3 text-sm hover:text-gray-800 dark:hover:text-gray-200 transition-colors px-1">{t('friends')}</button>
          <button className="text-gray-500 dark:text-gray-400 font-medium pb-3 text-sm hover:text-gray-800 dark:hover:text-gray-200 transition-colors px-1">{t('following')}</button>
          <button className="text-gray-500 dark:text-gray-400 font-medium pb-3 text-sm hover:text-gray-800 dark:hover:text-gray-200 transition-colors px-1">{t('myPosts')}</button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
               <p className="text-gray-500 dark:text-gray-400 text-lg">Loading posts...</p>
             </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <p className="text-red-500 text-lg">Error loading posts: {error.message}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No posts yet. Be the first to create one!</p>
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
                  alert('You must be logged in to like a post');
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
                      title: post.title || 'Check out this post',
                      text: post.description,
                      url: postUrl
                    });
                  } catch (err) {
                    if (err.name !== 'AbortError') {
                      // Fallback to copy
                      try {
                        await navigator.clipboard.writeText(postUrl);
                        alert('Link copied to clipboard!');
                      } catch (copyErr) {
                        console.error('Failed to copy:', copyErr);
                      }
                    }
                  }
                } else {
                  // Fallback to copy
                  try {
                    await navigator.clipboard.writeText(postUrl);
                    alert('Link copied to clipboard!');
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
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 size={16} />
                                Delete
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
                      <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {post.photos.slice(0, 3).map((photo, index) => (
                          <div key={index} className="relative aspect-video overflow-hidden rounded-lg">
                            <img
                              src={photo}
                              alt={`Post image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {post.photos.length > 3 && (
                          <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">+{post.photos.length - 3}</span>
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
                          {isClaimedByMe ? t('claimedByYou') : `${t('claimed')} ${post.claimedByName || 'someone'}`}
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
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">Community Event #{i}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">12 people joining</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Widget */}
          <div className="bg-gradient-to-br from-red-600 to-rose-500 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="font-bold text-lg mb-4">Your Impact</h3>
            <div className="space-y-4">
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">Tasks Completed</span>
                <span className="font-bold text-xl">24</span>
              </div>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">Angel Rating</span>
                <span className="font-bold text-xl">4.9 ⭐</span>
              </div>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-red-100">Badges Earned</span>
                <span className="font-bold text-xl">8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
