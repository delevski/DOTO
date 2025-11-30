import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle, Calendar, Award, ChevronDown, ChevronUp, User, Briefcase } from 'lucide-react';
import { db } from '../lib/instant';
import { useTranslation } from '../utils/translations';
import { useSettingsStore } from '../store/settingsStore';

// Component to fetch and display individual claimer stats
function ClaimerCard({ claimer, onApprove, isExpanded, onToggleExpand, isRTL }) {
  const t = useTranslation();
  
  // Fetch user stats and profile
  const { data: userData, isLoading: userLoading } = db.useQuery({
    users: {
      $: {
        where: { id: claimer.userId }
      }
    },
    posts: {}
  });

  const userRecord = userData?.users?.[0] || {};
  const allPosts = userData?.posts || [];
  
  // Calculate stats
  const claimedPosts = allPosts.filter(post => post.approvedClaimerId === claimer.userId);
  const completedTasks = claimedPosts.filter(post => post.isCompleted === true);
  const tasksCompleted = completedTasks.length;
  
  // Calculate average rating
  const postsWithRating = claimedPosts.filter(post => 
    post.isCompleted === true && 
    post.helperRating != null && 
    post.helperRating > 0
  );
  const totalRatingsReceived = postsWithRating.length;
  const sumOfRatings = postsWithRating.reduce((sum, post) => sum + (post.helperRating || 0), 0);
  const averageRating = totalRatingsReceived > 0 
    ? Math.round((sumOfRatings / totalRatingsReceived) * 10) / 10 
    : 0;

  // Format join date
  const formatJoinDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Format claim time
  const formatClaimTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} size={14} className="fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} size={14} className="text-gray-300 dark:text-gray-600" />);
      }
    }
    return stars;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}>
      {/* Main row - always visible */}
      <div 
        className={`p-4 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
        onClick={onToggleExpand}
      >
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div className="relative">
            <img 
              src={claimer.userAvatar || `https://i.pravatar.cc/150?u=${claimer.userId}`}
              alt={claimer.userName}
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
            />
            {averageRating >= 4.5 && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
                <Award size={12} className="text-white" />
              </div>
            )}
          </div>
          
          {/* Basic info */}
          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h4 className="font-bold text-gray-900 dark:text-white truncate">{claimer.userName}</h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatClaimTime(claimer.claimedAt)}
              </span>
            </div>
            
            {/* Rating and stats row */}
            <div className={`flex items-center gap-3 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {renderStars(averageRating)}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                  {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                </span>
              </div>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {tasksCompleted} {tasksCompleted === 1 ? 'task' : 'tasks'} done
              </span>
            </div>
          </div>
          
          {/* Expand indicator */}
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className="pt-4 space-y-4">
            {/* Bio */}
            {userRecord.bio && (
              <div>
                <h5 className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {t('bio') || 'About'}
                </h5>
                <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                  {userRecord.bio}
                </p>
              </div>
            )}
            
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <Briefcase size={18} className="mx-auto text-blue-500 mb-1" />
                <div className="text-lg font-bold text-gray-900 dark:text-white">{tasksCompleted}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Tasks Done</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <Star size={18} className="mx-auto text-yellow-500 mb-1" />
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Rating</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <Calendar size={18} className="mx-auto text-green-500 mb-1" />
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatJoinDate(userRecord.createdAt)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Joined</div>
              </div>
            </div>
            
            {/* Approve button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(claimer.userId);
              }}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold rounded-xl hover:from-red-700 hover:to-rose-600 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {t('approveClaimer') || 'Approve This Claimer'}
            </button>
          </div>
        </div>
      )}
      
      {/* Quick approve button when collapsed */}
      {!isExpanded && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(claimer.userId);
            }}
            className="w-full py-2.5 bg-gray-900 dark:bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} />
            {t('approve') || 'Approve'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClaimerSelectionModal({ isOpen, onClose, post, onApproveClaimer }) {
  const [expandedClaimerId, setExpandedClaimerId] = useState(null);
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  
  const claimers = post?.claimers || [];

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const handleApprove = (claimerUserId) => {
    onApproveClaimer(post.id, claimerUserId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-lg bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-fade-in ${isRTL ? 'rtl' : ''}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-500 px-6 py-5">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <h2 className="text-xl font-bold text-white">
                {t('chooseClaimer') || 'Choose a Claimer'}
              </h2>
              <p className="text-red-100 text-sm mt-1">
                {claimers.length} {claimers.length === 1 ? 'person wants' : 'people want'} to help
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>
        
        {/* Post info */}
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${isRTL ? 'text-right' : ''}`}>
            {post.title}
          </h3>
          <p className={`text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1 ${isRTL ? 'text-right' : ''}`}>
            {post.description}
          </p>
        </div>
        
        {/* Claimers list */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {claimers.length === 0 ? (
            <div className="text-center py-8">
              <User size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('noClaimersYet') || 'No claimers yet'}
              </p>
            </div>
          ) : (
            claimers.map((claimer) => (
              <ClaimerCard
                key={claimer.userId}
                claimer={claimer}
                onApprove={handleApprove}
                isExpanded={expandedClaimerId === claimer.userId}
                onToggleExpand={() => setExpandedClaimerId(
                  expandedClaimerId === claimer.userId ? null : claimer.userId
                )}
                isRTL={isRTL}
              />
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t('cancel') || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

