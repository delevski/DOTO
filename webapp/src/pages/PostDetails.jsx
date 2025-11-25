import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Share2, MessageCircle, Heart, Star, CheckCircle, Lock, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';

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

export default function PostDetails() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  // Fetch post from InstantDB
  const { isLoading, error, data } = db.useQuery({ 
    posts: { 
      $: { 
        where: { id: postId } 
      } 
    } 
  });
  
  const post = data?.posts?.[0];

  useEffect(() => {
    if (!isLoading && !error && !post) {
      navigate('/feed');
    }
  }, [post, isLoading, error, navigate]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (error || !post) {
    return null; // Handled by useEffect
  }

  const isClaimed = !!post.claimedBy;
  const isClaimedByMe = post.claimedBy === user?.id;
  const isMyPost = post.authorId === user?.id;

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

    if (isClaimed) {
      setLocalError('This post has already been claimed');
      return;
    }

    if (!user) {
      setLocalError('You must be logged in to claim a post');
      return;
    }

    try {
      db.transact(
        db.tx.posts[postId].update({
          claimedBy: user.id,
          claimedByName: user.name
        })
      );
      setLocalSuccess('Post claimed successfully!');
      setTimeout(() => {
        navigate('/feed');
      }, 1500);
    } catch (err) {
      setLocalError(err.message || 'Failed to claim post. Please try again.');
    }
  };

  const handleLike = () => {
    db.transact(
      db.tx.posts[postId].update({
        likes: (post.likes || 0) + 1
      })
    );
  };

  return (
    <div className={`max-w-5xl mx-auto px-6 py-8 ${isRTL ? 'rtl' : ''}`}>
      <button 
        onClick={() => navigate(-1)} 
        className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft size={20} className={isRTL ? 'group-hover:translate-x-1 transition-transform' : 'group-hover:-translate-x-1 transition-transform'} />
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
            isClaimed ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700'
          }`}>
            <div className="p-8">
              {/* Author Header */}
              <div className={`flex items-start justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex gap-4 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={post.avatar} alt={post.author} className="w-16 h-16 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-700" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{post.author}</h2>
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
                {isClaimed && (
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
                        <Lock size={16} />
                        {t('alreadyClaimed')}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Post Content */}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg mb-6">{post.description}</p>

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
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6 overflow-hidden relative">
                <MapContainer 
                  center={[40.7128, -74.0060]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  scrollWheelZoom={false}
                  dragging={false}
                  doubleClickZoom={false}
                  touchZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[40.7128, -74.0060]}>
                    <Popup>
                      {post.location || 'Location'}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Actions */}
              <div className={`flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Heart size={22} className={post.likes > 0 ? 'fill-red-500 text-red-500' : 'group-hover:fill-current'} />
                    <span className="font-medium">{post.likes}</span>
                  </button>
                  <button className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <MessageCircle size={22} />
                    <span className="font-medium">Comment</span>
                  </button>
                  <button className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Share2 size={22} />
                    <span className="font-medium">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Comments ({post.comments})</h3>
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={`https://i.pravatar.cc/150?u=comment${i}`} alt="User" className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-semibold text-gray-900 dark:text-white">User {i}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">2h ago</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">Great! I can help with this. When would be a good time?</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Claim Card */}
          <div className={`rounded-2xl shadow-xl p-8 text-white sticky top-8 ${
            isClaimed 
              ? 'bg-gradient-to-br from-gray-600 to-gray-700' 
              : 'bg-gradient-to-br from-red-600 to-rose-500'
          }`}>
            {isClaimed ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Lock size={24} />
                  <h3 className="text-2xl font-bold">Already Claimed</h3>
                </div>
                <p className="text-gray-200 mb-6">
                  {isClaimedByMe 
                    ? 'You have claimed this task. Good luck!' 
                    : `This task has been claimed by ${post.claimedByName || 'someone'}.`}
                </p>
                {isClaimedByMe && (
                  <button className="w-full bg-white/20 text-white font-bold py-4 rounded-xl hover:bg-white/30 transition-colors text-lg border border-white/30">
                    View My Claims
                  </button>
                )}
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold mb-2">Claim This Task</h3>
                <p className="text-red-50 mb-6">Help {post.author} and earn rewards!</p>
                {isMyPost ? (
                  <div className="bg-white/20 p-4 rounded-xl text-center text-red-50">
                    <p className="font-medium">This is your own post</p>
                    <p className="text-sm mt-1">You cannot claim your own tasks</p>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={handleClaim}
                      className="w-full bg-white text-red-600 font-bold py-4 rounded-xl shadow-lg hover:bg-gray-50 transition-colors text-lg mb-6"
                    >
                      Claim Now
                    </button>
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
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">About {post.author}</h3>
            <div className="space-y-3">
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600 dark:text-gray-400">Tasks Posted</span>
                <span className="font-semibold text-gray-900 dark:text-white">12</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600 dark:text-gray-400">Tasks Completed</span>
                <span className="font-semibold text-gray-900 dark:text-white">8</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600 dark:text-gray-400">Angel Rating</span>
                <span className="font-semibold flex items-center gap-1 text-gray-900 dark:text-white">
                  4.8 <Star size={14} className="text-yellow-400 fill-current" />
                </span>
              </div>
            </div>
            <button className="w-full mt-6 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
