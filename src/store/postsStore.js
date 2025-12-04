import { create } from 'zustand';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Maximum number of posts to cache (to prevent memory issues)
const MAX_CACHED_POSTS = 200;

// Debounce time for refetch (30 seconds)
const REFETCH_DEBOUNCE = 30 * 1000;

/**
 * Centralized posts store to prevent duplicate fetching across screens
 * and manage pagination to reduce memory usage
 * 
 * Features:
 * - TTL-based cache invalidation
 * - Per-tab caching
 * - Memory-conscious limits
 * - Deduplication of posts
 */
export const usePostsStore = create((set, get) => ({
  // Posts cache - keyed by post ID for efficient lookup
  postsById: {},
  
  // Array of post IDs in display order
  postIds: [],
  
  // Per-tab cache with timestamps
  tabCache: {
    nearby: { postIds: [], timestamp: 0 },
    friends: { postIds: [], timestamp: 0 },
    myPosts: { postIds: [], timestamp: 0 },
    myClaims: { postIds: [], timestamp: 0 },
  },
  
  // Loading states
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  
  // Last fetch timestamp to prevent rapid re-fetches
  lastFetchTime: 0,
  
  // Pagination
  pageSize: 20,
  currentPage: 0,
  
  // Error state
  error: null,
  
  // Get all posts as array (for components that need array)
  getPosts: () => {
    const state = get();
    return state.postIds.map(id => state.postsById[id]).filter(Boolean);
  },
  
  // Get posts for a specific tab (uses cached order if fresh)
  getPostsForTab: (tab) => {
    const state = get();
    const cache = state.tabCache[tab];
    
    if (cache && cache.postIds.length > 0 && (Date.now() - cache.timestamp) < CACHE_TTL) {
      return cache.postIds.map(id => state.postsById[id]).filter(Boolean);
    }
    
    return null; // Cache miss or stale
  },
  
  // Get a single post by ID
  getPost: (postId) => {
    return get().postsById[postId] || null;
  },
  
  // Set posts from query result (replaces all for a tab)
  setPosts: (posts, tab = null) => {
    const state = get();
    const newPostsById = { ...state.postsById };
    const newPostIds = [];
    
    posts.forEach(post => {
      if (post && post.id) {
        newPostsById[post.id] = post;
        newPostIds.push(post.id);
      }
    });
    
    // Limit total cached posts to prevent memory issues
    const allPostIds = Object.keys(newPostsById);
    if (allPostIds.length > MAX_CACHED_POSTS) {
      // Remove oldest posts (not in current set)
      const currentSet = new Set(newPostIds);
      const toRemove = allPostIds
        .filter(id => !currentSet.has(id))
        .slice(0, allPostIds.length - MAX_CACHED_POSTS);
      
      toRemove.forEach(id => delete newPostsById[id]);
    }
    
    const updates = {
      postsById: newPostsById,
      postIds: newPostIds,
      isLoading: false,
      lastFetchTime: Date.now(),
    };
    
    // Update tab cache if tab is specified
    if (tab && state.tabCache[tab]) {
      updates.tabCache = {
        ...state.tabCache,
        [tab]: { postIds: newPostIds, timestamp: Date.now() },
      };
    }
    
    set(updates);
  },
  
  // Add more posts (for pagination)
  addPosts: (posts) => {
    const state = get();
    const newPostsById = { ...state.postsById };
    const newPostIds = [...state.postIds];
    
    posts.forEach(post => {
      if (post && post.id && !newPostsById[post.id]) {
        newPostsById[post.id] = post;
        newPostIds.push(post.id);
      }
    });
    
    set({
      postsById: newPostsById,
      postIds: newPostIds,
      isLoadingMore: false,
      hasMore: posts.length >= state.pageSize,
    });
  },
  
  // Update a single post
  updatePost: (postId, updates) => {
    const state = get();
    if (!state.postsById[postId]) return;
    
    set({
      postsById: {
        ...state.postsById,
        [postId]: { ...state.postsById[postId], ...updates }
      }
    });
  },
  
  // Remove a post
  removePost: (postId) => {
    const state = get();
    const newPostsById = { ...state.postsById };
    delete newPostsById[postId];
    
    // Also remove from tab caches
    const newTabCache = { ...state.tabCache };
    Object.keys(newTabCache).forEach(tab => {
      newTabCache[tab] = {
        ...newTabCache[tab],
        postIds: newTabCache[tab].postIds.filter(id => id !== postId),
      };
    });
    
    set({
      postsById: newPostsById,
      postIds: state.postIds.filter(id => id !== postId),
      tabCache: newTabCache,
    });
  },
  
  // Invalidate tab cache
  invalidateTabCache: (tab) => {
    const state = get();
    if (state.tabCache[tab]) {
      set({
        tabCache: {
          ...state.tabCache,
          [tab]: { postIds: [], timestamp: 0 },
        },
      });
    }
  },
  
  // Invalidate all tab caches
  invalidateAllCaches: () => {
    set({
      tabCache: {
        nearby: { postIds: [], timestamp: 0 },
        friends: { postIds: [], timestamp: 0 },
        myPosts: { postIds: [], timestamp: 0 },
        myClaims: { postIds: [], timestamp: 0 },
      },
    });
  },
  
  // Check if tab cache is fresh
  isTabCacheFresh: (tab) => {
    const state = get();
    const cache = state.tabCache[tab];
    return cache && cache.postIds.length > 0 && (Date.now() - cache.timestamp) < CACHE_TTL;
  },
  
  // Set loading state
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setError: (error) => set({ error }),
  
  // Reset store
  reset: () => set({
    postsById: {},
    postIds: [],
    tabCache: {
      nearby: { postIds: [], timestamp: 0 },
      friends: { postIds: [], timestamp: 0 },
      myPosts: { postIds: [], timestamp: 0 },
      myClaims: { postIds: [], timestamp: 0 },
    },
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    lastFetchTime: 0,
    currentPage: 0,
    error: null,
  }),
  
  // Check if we should refetch (debounce)
  shouldRefetch: () => {
    const state = get();
    const timeSinceLastFetch = Date.now() - state.lastFetchTime;
    return timeSinceLastFetch > REFETCH_DEBOUNCE;
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const state = get();
    return {
      totalPosts: Object.keys(state.postsById).length,
      displayedPosts: state.postIds.length,
      tabCaches: Object.entries(state.tabCache).map(([tab, cache]) => ({
        tab,
        count: cache.postIds.length,
        fresh: (Date.now() - cache.timestamp) < CACHE_TTL,
        age: Math.round((Date.now() - cache.timestamp) / 1000),
      })),
    };
  },
}));

export default usePostsStore;

