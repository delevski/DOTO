import { useMemo } from 'react';
import { db } from '../lib/instant';

// Points configuration
const POINTS_CONFIG = {
  POST_CREATED: 10,
  TASK_COMPLETED: 50,
  LIKE_RECEIVED: 2,
  COMMENT_MADE: 5,
};

/**
 * Hook to fetch and calculate real user statistics from the database
 * @param {string} userId - The ID of the user to fetch stats for
 * @returns {Object} User statistics including posts, tasks, rating, points, badges data
 */
export function useUserStats(userId) {
  // Fetch all necessary data from InstantDB
  // Note: InstantDB query keys must match actual collection names
  const { data, isLoading, error } = db.useQuery(userId ? {
    posts: {},    // All posts - we'll filter client-side
    comments: {}, // All comments - we'll filter client-side
    users: {      // User record for streak data
      $: {
        where: { id: userId }
      }
    }
  } : null);

  // Calculate all statistics
  const stats = useMemo(() => {
    if (!userId || !data) {
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
        isLoading: true,
      };
    }

    const allPosts = data.posts || [];
    const allComments = data.comments || [];
    const userRecord = data.users?.[0] || {};

    // Filter posts created by this user
    const userPosts = allPosts.filter(post => post.authorId === userId);
    
    // Filter posts where this user was approved claimer
    const claimedPosts = allPosts.filter(post => post.approvedClaimerId === userId);
    
    // Filter comments made by this user
    const userComments = allComments.filter(comment => comment.authorId === userId);

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

    // Calculate first claims (user was the first person to claim a post)
    const firstClaimCount = allPosts.filter(post => {
      const claimers = post.claimers || [];
      if (claimers.length === 0) return false;
      // Sort claimers by claimedAt timestamp
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
    };
  }, [userId, data]);

  return {
    ...stats,
    isLoading: isLoading || stats.isLoading,
    error,
  };
}

/**
 * Hook to fetch stats for a specific user (not the current user)
 * Useful for showing other user's stats in PostDetails
 * @param {string} userId - The ID of the user to fetch stats for
 */
export function useOtherUserStats(userId) {
  const { data, isLoading, error } = db.useQuery(userId ? {
    posts: {}  // Query all posts, filter client-side
  } : null);

  const stats = useMemo(() => {
    if (!userId || !data) {
      return {
        postsCreated: 0,
        tasksCompleted: 0,
        averageRating: 0,
        isLoading: true,
      };
    }

    const allPosts = data.posts || [];
    
    // Filter posts created by this user
    const userPosts = allPosts.filter(post => post.authorId === userId);
    
    // Filter posts where this user was approved claimer
    const claimedPosts = allPosts.filter(post => post.approvedClaimerId === userId);

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
  }, [userId, data]);

  return {
    ...stats,
    isLoading: isLoading || stats.isLoading,
    error,
  };
}

export default useUserStats;

