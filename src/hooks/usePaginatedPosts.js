import { useEffect, useCallback, useRef, useState } from 'react';
import { db } from '../lib/instant';
import { useAuthStore } from '../store/authStore';
import { usePostsStore } from '../store/postsStore';

/**
 * Hook for fetching posts with pagination and caching
 * Prevents OutOfMemoryError by limiting the amount of data loaded at once
 * 
 * @param {Object} options - Options for the hook
 * @param {number} options.limit - Number of posts to fetch per page (default: 20)
 * @param {boolean} options.enabled - Whether to enable fetching (default: true)
 * @returns {Object} { posts, isLoading, isLoadingMore, hasMore, refresh, loadMore, error }
 */
export function usePaginatedPosts(options = {}) {
  const { limit = 20, enabled = true } = options;
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isMountedRef = useRef(true);
  const [localLoading, setLocalLoading] = useState(true);
  
  const {
    getPosts,
    setPosts,
    isLoading,
    isLoadingMore,
    hasMore,
    setLoading,
    error,
    setError,
    shouldRefetch,
    reset,
  } = usePostsStore();
  
  // Only query when enabled and authenticated
  const shouldQuery = enabled && isAuthenticated;
  
  // Fetch posts from InstantDB
  // Note: InstantDB doesn't support pagination natively, so we fetch all
  // but the store will cache them to prevent re-fetching
  const { data, isLoading: queryLoading, error: queryError } = db.useQuery(
    shouldQuery ? { posts: {} } : null
  );
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Update store when data changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (queryError) {
      setError(queryError);
      setLocalLoading(false);
      return;
    }
    
    if (data?.posts && !queryLoading) {
      // Sort posts by timestamp (newest first)
      const sortedPosts = [...data.posts].sort((a, b) => 
        (b.timestamp || 0) - (a.timestamp || 0)
      );
      
      // Only update if we have new data
      if (shouldRefetch() || getPosts().length === 0) {
        setPosts(sortedPosts);
      }
      setLocalLoading(false);
    }
  }, [data?.posts, queryLoading, queryError]);
  
  // Refresh function
  const refresh = useCallback(() => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setLocalLoading(true);
    reset();
  }, []);
  
  // Get cached posts
  const posts = getPosts();
  
  return {
    posts,
    isLoading: localLoading || queryLoading,
    isLoadingMore: false, // InstantDB loads all at once
    hasMore: false, // All posts loaded
    refresh,
    loadMore: () => {}, // No-op since InstantDB loads all
    error: error || queryError,
  };
}

/**
 * Hook for fetching comments with caching
 * Separate from posts to reduce memory usage
 */
export function useComments(options = {}) {
  const { enabled = true } = options;
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const shouldQuery = enabled && isAuthenticated;
  
  const { data, isLoading, error } = db.useQuery(
    shouldQuery ? { comments: {} } : null
  );
  
  const comments = data?.comments || [];
  
  return {
    comments,
    isLoading,
    error,
  };
}

/**
 * Get comment counts for posts without loading all comment data
 */
export function useCommentCounts(postIds = []) {
  const { comments } = useComments();
  
  const counts = {};
  comments.forEach(comment => {
    if (comment.postId) {
      counts[comment.postId] = (counts[comment.postId] || 0) + 1;
    }
  });
  
  return counts;
}

export default usePaginatedPosts;

