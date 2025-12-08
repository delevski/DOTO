/**
 * Hook for fetching filtered posts based on active tab
 * 
 * Implements smart query filtering to reduce data transfer and memory usage.
 * Each tab fetches only the data it needs instead of all posts.
 * 
 * Features:
 * - Only queries when screen is focused
 * - Per-tab caching with TTL
 * - Location-based filtering for nearby tab
 * - Social friends filtering for friends tab
 * - Strips large data from list view
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { db } from '../lib/instant';
import { useAuthStore } from '../store/authStore';
import { 
  filterValidPosts, 
  sortByNewest, 
  stripLargeData,
} from '../utils/postFilters';

// Cache for storing filtered results per tab
const tabCache = {
  nearby: { data: null, timestamp: 0 },
  friends: { data: null, timestamp: 0 },
  myPosts: { data: null, timestamp: 0 },
  myClaims: { data: null, timestamp: 0 },
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Maximum posts to fetch per query (to prevent OOM)
const MAX_POSTS_LIMIT = 100;

/**
 * Hook for fetching and filtering posts based on active tab
 * 
 * @param {string} activeTab - The current active tab ('nearby', 'friends', 'myPosts', 'myClaims')
 * @param {Object} options - Additional options
 * @returns {Object} { posts, isLoading, error, refresh, userLocation }
 */
export function useFilteredPosts(activeTab, options = {}) {
  const { enabled = true } = options;
  
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Track screen focus - only query when focused
  const isFocused = useIsFocused();
  
  const [localLoading, setLocalLoading] = useState(true);
  const [queryEnabled, setQueryEnabled] = useState(false);
  
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Only enable query when screen is focused
  // This prevents unnecessary data fetching when the user is on a different tab
  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      setQueryEnabled(true);
      
      return () => {
        // Screen is unfocused - disable query
        setQueryEnabled(false);
      };
    }, [])
  );
  
  // Build the query based on active tab
  // Only build query when screen is focused and enabled
  const query = useMemo(() => {
    // Don't query if not enabled, not authenticated, or screen not focused
    if (!enabled || !isAuthenticated || !queryEnabled) return null;
    
    // For all tabs, we fetch posts with specific filters
    // Let InstantDB handle its own caching - don't skip queries
    switch (activeTab) {
      case 'myPosts':
        // Only fetch user's own posts
        return {
          posts: {
            $: {
              where: {
                authorId: user?.id,
              },
            },
          },
        };
      
      case 'myClaims':
        // Only fetch posts where user is the approved claimer
        return {
          posts: {
            $: {
              where: {
                approvedClaimerId: user?.id,
              },
            },
          },
        };
      
      case 'friends':
        // Fetch all posts and users - we'll filter client-side by friends
        return {
          posts: {},
          users: {},
        };
      
      case 'nearby':
      default:
        // Fetch all posts - we'll filter client-side
        return {
          posts: {},
        };
    }
  }, [activeTab, user?.id, isAuthenticated, enabled, queryEnabled]);
  
  // Fetch data from InstantDB
  const { data, isLoading: queryLoading, error: queryError } = db.useQuery(query);
  
  // Get user's social friends list
  const socialFriends = useMemo(() => {
    return user?.socialFriends || [];
  }, [user?.socialFriends]);
  
  // Check if user has connected a social account
  const hasSocialConnection = useMemo(() => {
    return !!(user?.googleId || user?.facebookId);
  }, [user?.googleId, user?.facebookId]);
  
  // Process and filter posts based on active tab
  const processedPosts = useMemo(() => {
    if (!data?.posts) return [];
    
    let posts = data.posts;
    const allUsers = data?.users || [];
    
    // Filter out invalid (expired/archived) posts
    posts = filterValidPosts(posts);
    
    // Apply tab-specific filtering
    switch (activeTab) {
      case 'nearby':
        // Show all available posts (not claimed, not archived)
        posts = posts.filter(post => !post.approvedClaimerId && !post.isArchived);
        // Sort by newest first
        posts = sortByNewest(posts);
        break;
      
      case 'friends':
        // Filter posts to show only those from social friends
        if (socialFriends.length > 0) {
          // socialFriends contains DOTO user IDs of friends
          posts = posts.filter(post => {
            // Include posts from users in socialFriends list
            return socialFriends.includes(post.authorId);
          });
        } else if (hasSocialConnection) {
          // User connected social but has no friends on DOTO yet
          posts = [];
        } else {
          // User hasn't connected any social account
          // Return empty - UI will show prompt to connect
          posts = [];
        }
        posts = sortByNewest(posts);
        break;
      
      case 'myPosts':
        posts = sortByNewest(posts);
        break;
      
      case 'myClaims':
        posts = sortByNewest(posts);
        break;
      
      default:
        posts = sortByNewest(posts);
    }
    
    // Strip large data (photos, claimers arrays) for list view
    // These will be loaded when viewing post details
    // Pass current user ID to preserve isLikedByMe flag
    posts = stripLargeData(posts, user?.id);
    
    // Limit the number of posts
    posts = posts.slice(0, MAX_POSTS_LIMIT);
    
    return posts;
  }, [data?.posts, data?.users, activeTab, socialFriends, hasSocialConnection, user?.id]);
  
  // Update loading state when query finishes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (!queryLoading) {
      setLocalLoading(false);
    }
  }, [queryLoading]);
  
  // Refresh function - just triggers a re-render
  const refresh = useCallback(() => {
    setLocalLoading(true);
    // Clear tab cache
    tabCache[activeTab] = { data: null, timestamp: 0 };
  }, [activeTab]);
  
  // Use processed posts directly - InstantDB handles caching
  const posts = processedPosts;
  
  // Only show loading when we don't have any data to display
  const isLoading = (queryLoading || localLoading) && posts.length === 0;
  
  return {
    posts,
    isLoading,
    error: queryError,
    refresh,
    isFocused, // Expose focus state for debugging
    hasSocialConnection, // Whether user has connected Google/Facebook
    socialFriendsCount: socialFriends.length, // Number of friends on DOTO
  };
}

/**
 * Clear all tab caches
 * Call this when data might have changed (e.g., after creating a post)
 */
export function clearPostsCache() {
  Object.keys(tabCache).forEach(key => {
    tabCache[key] = { data: null, timestamp: 0 };
  });
}

/**
 * Clear cache for a specific tab
 */
export function clearTabCache(tab) {
  if (tabCache[tab]) {
    tabCache[tab] = { data: null, timestamp: 0 };
  }
}

export default useFilteredPosts;

