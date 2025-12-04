import { useMemo, useRef, useEffect } from 'react';
import { db } from '../lib/instant';
import { useAuthStore } from '../store/authStore';

// Points configuration - matches webapp
const POINTS_CONFIG = {
  POST_CREATED: 10,
  TASK_COMPLETED: 50,
  LIKE_RECEIVED: 2,
  COMMENT_MADE: 5,
};

/**
 * Hook to fetch and calculate real user statistics from the database
 * OPTIMIZED: Only queries posts related to the user instead of ALL posts
 * This prevents OutOfMemoryError by not loading all posts with base64 images
 * 
 * @param {string} userId - The ID of the user to fetch stats for
 * @param {Object} options - Additional options
 * @param {boolean} options.enabled - Whether to enable queries (default: true)
 * @returns {Object} User statistics including posts, tasks, rating, points, badges data
 */
export function useUserStats(userId, options = {}) {
  const { enabled = true } = options;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Only query when authenticated, userId is valid, and enabled
  const shouldQuery = isAuthenticated && userId && enabled;
  
  // OPTIMIZED: Query only posts created by or claimed by the user
  // This dramatically reduces memory usage by not loading all posts with images
  const { data: userPostsData, isLoading: postsLoading } = db.useQuery(shouldQuery ? {
    posts: {
      $: {
        where: { authorId: userId }
      }
    }
  } : null);
  
  // Query posts where user is the approved claimer (separate query)
  const { data: claimedPostsData, isLoading: claimedLoading } = db.useQuery(shouldQuery ? {
    posts: {
      $: {
        where: { approvedClaimerId: userId }
      }
    }
  } : null);
  
  // Query comments made by user
  const { data: commentsData, isLoading: commentsLoading } = db.useQuery(shouldQuery ? {
    comments: {
      $: {
        where: { authorId: userId }
      }
    }
  } : null);
  
  // Query user record for streak data
  const { data: userData, isLoading: userLoading } = db.useQuery(shouldQuery ? {
    users: {
      $: {
        where: { id: userId }
      }
    }
  } : null);

  const isLoading = postsLoading || claimedLoading || commentsLoading || userLoading;

  // Calculate all statistics
  const stats = useMemo(() => {
    if (!userId) {
      return getEmptyStats(true);
    }
    
    if (isLoading) {
      return getEmptyStats(true);
    }

    const userPosts = userPostsData?.posts || [];
    const claimedPosts = claimedPostsData?.posts || [];
    const userComments = commentsData?.comments || [];
    const userRecord = userData?.users?.[0] || {};

    // Posts created count
    const postsCreated = userPosts.length;

    // Tasks completed (posts where user was approved claimer AND post is completed)
    const completedTasks = claimedPosts.filter(post => post.isCompleted === true);
    const tasksCompleted = completedTasks.length;

    // Calculate average rating from all posts where user was the helper and received a rating
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

    // Calculate total likes received on user's posts
    const totalLikesReceived = userPosts.reduce((sum, post) => {
      const likes = post.likedBy?.length || post.likes || 0;
      return sum + likes;
    }, 0);

    // Comments made count
    const commentsMade = userComments.length;

    // First claim count - simplified (we can't check all posts for first claim without loading all)
    // Use claimed posts where user was first in the claimers array
    const firstClaimCount = claimedPosts.filter(post => {
      const claimers = post.claimers || [];
      if (claimers.length === 0) return false;
      const sortedClaimers = [...claimers].sort((a, b) => (a.claimedAt || 0) - (b.claimedAt || 0));
      return sortedClaimers[0]?.userId === userId;
    }).length;

    // Calculate total points
    const totalPoints = 
      (postsCreated * POINTS_CONFIG.POST_CREATED) +
      (tasksCompleted * POINTS_CONFIG.TASK_COMPLETED) +
      (totalLikesReceived * POINTS_CONFIG.LIKE_RECEIVED) +
      (commentsMade * POINTS_CONFIG.COMMENT_MADE);

    // Calculate total engagement (for Community Leader badge)
    const totalEngagement = postsCreated + tasksCompleted + commentsMade;

    // Get streak data from user record
    const currentStreak = userRecord.currentStreak || 0;
    const longestStreak = userRecord.longestStreak || 0;
    const lastActivityDate = userRecord.lastActivityDate || null;
    
    // Verification and early adopter status
    const isVerified = userRecord.isVerified || userRecord.emailVerified || false;
    const isEarlyAdopter = userRecord.isEarlyAdopter || false;
    
    // Conversations started (simplified - count based on posts)
    const conversationsStarted = Math.min(postsCreated, 5);

    return {
      postsCreated,
      tasksCompleted,
      totalRatingsReceived,
      averageRating,
      totalLikesReceived,
      commentsMade,
      totalPoints,
      firstClaimCount,
      currentStreak,
      longestStreak,
      lastActivityDate,
      totalEngagement,
      isLoading: false,
      isVerified,
      isEarlyAdopter,
      conversationsStarted,
    };
  }, [userId, isLoading, userPostsData, claimedPostsData, commentsData, userData]);

  return {
    ...stats,
    isLoading: isLoading || stats.isLoading,
  };
}

/**
 * Helper function to return empty stats
 */
function getEmptyStats(isLoading = false) {
  return {
    postsCreated: 0,
    tasksCompleted: 0,
    totalRatingsReceived: 0,
    averageRating: 0,
    totalLikesReceived: 0,
    commentsMade: 0,
    totalPoints: 0,
    firstClaimCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalEngagement: 0,
    isLoading,
    isVerified: false,
    isEarlyAdopter: false,
    conversationsStarted: 0,
  };
}

/**
 * Hook to fetch stats for a specific user (not the current user)
 * Useful for showing other user's stats in PostDetails
 * OPTIMIZED: Only queries posts related to the specified user
 * 
 * @param {string} userId - The ID of the user to fetch stats for
 */
export function useOtherUserStats(userId) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const shouldQuery = isAuthenticated && userId;
  
  // OPTIMIZED: Only query posts created by this user
  const { data: userPostsData, isLoading: postsLoading } = db.useQuery(shouldQuery ? {
    posts: {
      $: {
        where: { authorId: userId }
      }
    }
  } : null);
  
  // Query posts where user is the approved claimer
  const { data: claimedPostsData, isLoading: claimedLoading } = db.useQuery(shouldQuery ? {
    posts: {
      $: {
        where: { approvedClaimerId: userId }
      }
    }
  } : null);

  const isLoading = postsLoading || claimedLoading;

  const stats = useMemo(() => {
    if (!userId || isLoading) {
      return {
        postsCreated: 0,
        tasksCompleted: 0,
        averageRating: 0,
        isLoading: true,
      };
    }

    const userPosts = userPostsData?.posts || [];
    const claimedPosts = claimedPostsData?.posts || [];

    const postsCreated = userPosts.length;
    const completedTasks = claimedPosts.filter(post => post.isCompleted === true);
    const tasksCompleted = completedTasks.length;

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

    return {
      postsCreated,
      tasksCompleted,
      averageRating,
      isLoading: false,
    };
  }, [userId, isLoading, userPostsData, claimedPostsData]);

  return {
    ...stats,
    isLoading: isLoading || stats.isLoading,
  };
}

export default useUserStats;
