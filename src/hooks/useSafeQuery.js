import { useEffect, useRef, useState, useMemo } from 'react';
import { db } from '../lib/instant';

/**
 * A safe wrapper around InstantDB's useQuery that prevents:
 * - State updates after unmount
 * - Crashes when query params are undefined
 * - Crashes during rapid tab switches
 * 
 * @param {Object|null} query - The query object, or null to skip the query
 * @param {Object} options - Options for the hook
 * @returns {Object} { data, isLoading, error }
 */
export function useSafeQuery(query, options = {}) {
  const { enabled = true } = options;
  const isMountedRef = useRef(true);
  const [safeData, setSafeData] = useState(null);
  const [safeError, setSafeError] = useState(null);
  const [safeLoading, setSafeLoading] = useState(true);
  
  // Only run the query if enabled and query is valid
  const shouldQuery = enabled && query !== null && query !== undefined;
  
  // Use the actual InstantDB hook conditionally
  // Pass an empty query if disabled to prevent hook order issues
  const queryResult = db.useQuery(shouldQuery ? query : { __skip__: {} });
  
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Safely update local state when query result changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (!shouldQuery) {
      setSafeData(null);
      setSafeLoading(false);
      setSafeError(null);
      return;
    }
    
    // Handle the query result safely
    try {
      if (queryResult.isLoading) {
        setSafeLoading(true);
      } else {
        setSafeLoading(false);
        
        if (queryResult.error) {
          setSafeError(queryResult.error);
          setSafeData(null);
        } else {
          setSafeError(null);
          // Filter out the __skip__ key if present
          const filteredData = queryResult.data ? 
            Object.fromEntries(
              Object.entries(queryResult.data).filter(([key]) => key !== '__skip__')
            ) : null;
          setSafeData(filteredData);
        }
      }
    } catch (err) {
      console.error('useSafeQuery error:', err);
      if (isMountedRef.current) {
        setSafeError(err);
        setSafeLoading(false);
      }
    }
  }, [queryResult.isLoading, queryResult.error, queryResult.data, shouldQuery]);
  
  return useMemo(() => ({
    data: safeData,
    isLoading: safeLoading,
    error: safeError,
  }), [safeData, safeLoading, safeError]);
}

/**
 * Hook for querying posts safely
 */
export function useSafePosts(options = {}) {
  return useSafeQuery({ posts: {} }, options);
}

/**
 * Hook for querying posts and comments safely
 */
export function useSafePostsAndComments(options = {}) {
  return useSafeQuery({ posts: {}, comments: {} }, options);
}

/**
 * Hook for querying conversations and messages safely
 */
export function useSafeConversations(options = {}) {
  return useSafeQuery({ conversations: {}, messages: {} }, options);
}

/**
 * Hook for querying a single post by ID
 */
export function useSafePost(postId, options = {}) {
  const query = postId ? {
    posts: { $: { where: { id: postId } } },
    comments: { $: { where: { postId: postId } } }
  } : null;
  
  return useSafeQuery(query, { ...options, enabled: options.enabled !== false && !!postId });
}

/**
 * Hook for querying user stats data safely
 */
export function useSafeUserStatsData(userId, options = {}) {
  const query = userId ? {
    posts: {},
    comments: {},
    users: { $: { where: { id: userId } } }
  } : null;
  
  return useSafeQuery(query, { ...options, enabled: options.enabled !== false && !!userId });
}

export default useSafeQuery;

