/**
 * Post Filtering Utilities
 * 
 * Provides functions to filter posts based on validity, expiration, location, and ownership.
 * Used to reduce the amount of data processed and displayed in the app.
 */

// Constants for post filtering
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const EARTH_RADIUS_KM = 6371;

/**
 * Check if a post is valid (not expired and not archived)
 * 
 * @param {Object} post - The post object to check
 * @param {Object} options - Options for validation
 * @param {number} options.maxAge - Maximum age in milliseconds (default: 30 days)
 * @returns {boolean} - True if the post is valid
 */
export function isPostValid(post, options = {}) {
  const { maxAge = THIRTY_DAYS_MS } = options;
  
  if (!post) return false;
  
  // Check if post is archived
  if (post.isArchived === true) {
    return false;
  }
  
  // Check if post is expired based on custom expiration field
  if (post.expiresAt && post.expiresAt < Date.now()) {
    return false;
  }
  
  // Check if post is expired based on timestamp (older than maxAge)
  const postTime = post.timestamp || post.createdAt || 0;
  if (postTime && (Date.now() - postTime) > maxAge) {
    return false;
  }
  
  return true;
}

/**
 * Filter an array of posts to only include valid posts
 * 
 * @param {Array} posts - Array of post objects
 * @param {Object} options - Options for filtering
 * @returns {Array} - Filtered array of valid posts
 */
export function filterValidPosts(posts, options = {}) {
  if (!Array.isArray(posts)) return [];
  return posts.filter(post => isPostValid(post, options));
}

/**
 * Calculate distance between two points using Haversine formula
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Check if a post is within a certain radius of a location
 * 
 * @param {Object} post - The post object
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} radiusKm - Radius in kilometers (default: 25km)
 * @returns {boolean} - True if post is within radius
 */
export function isPostNearby(post, userLat, userLon, radiusKm = 25) {
  if (!post || !userLat || !userLon) return false;
  
  const postLat = post.latitude;
  const postLon = post.longitude;
  
  if (!postLat || !postLon) return false;
  
  const distance = calculateDistance(userLat, userLon, postLat, postLon);
  return distance <= radiusKm;
}

/**
 * Filter posts to only include those within a radius
 * 
 * @param {Array} posts - Array of post objects
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} radiusKm - Radius in kilometers (default: 25km)
 * @returns {Array} - Filtered array of nearby posts
 */
export function filterNearbyPosts(posts, userLat, userLon, radiusKm = 25) {
  if (!Array.isArray(posts)) return [];
  if (!userLat || !userLon) return posts; // If no user location, return all
  
  return posts.filter(post => isPostNearby(post, userLat, userLon, radiusKm));
}

/**
 * Filter posts by author (My Posts tab)
 * 
 * @param {Array} posts - Array of post objects
 * @param {string} userId - The user's ID
 * @returns {Array} - Filtered array of user's posts
 */
export function filterMyPosts(posts, userId) {
  if (!Array.isArray(posts) || !userId) return [];
  return posts.filter(post => post.authorId === userId);
}

/**
 * Filter posts by claimed status (My Claims tab)
 * 
 * @param {Array} posts - Array of post objects
 * @param {string} userId - The user's ID
 * @returns {Array} - Filtered array of posts claimed by user
 */
export function filterMyClaims(posts, userId) {
  if (!Array.isArray(posts) || !userId) return [];
  return posts.filter(post => post.approvedClaimerId === userId);
}

/**
 * Filter posts by friends (Friends tab)
 * 
 * @param {Array} posts - Array of post objects
 * @param {Array} friendIds - Array of friend user IDs
 * @returns {Array} - Filtered array of posts from friends
 */
export function filterFriendsPosts(posts, friendIds) {
  if (!Array.isArray(posts) || !Array.isArray(friendIds)) return [];
  const friendSet = new Set(friendIds);
  return posts.filter(post => friendSet.has(post.authorId));
}

/**
 * Sort posts by timestamp (newest first)
 * 
 * @param {Array} posts - Array of post objects
 * @returns {Array} - Sorted array of posts
 */
export function sortByNewest(posts) {
  if (!Array.isArray(posts)) return [];
  return [...posts].sort((a, b) => {
    const timeA = a.timestamp || a.createdAt || 0;
    const timeB = b.timestamp || b.createdAt || 0;
    return timeB - timeA;
  });
}

/**
 * Sort posts by distance from user
 * 
 * @param {Array} posts - Array of post objects
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @returns {Array} - Sorted array of posts (closest first)
 */
export function sortByDistance(posts, userLat, userLon) {
  if (!Array.isArray(posts)) return [];
  if (!userLat || !userLon) return posts;
  
  return [...posts].sort((a, b) => {
    const distA = a.latitude && a.longitude 
      ? calculateDistance(userLat, userLon, a.latitude, a.longitude)
      : Infinity;
    const distB = b.latitude && b.longitude 
      ? calculateDistance(userLat, userLon, b.latitude, b.longitude)
      : Infinity;
    return distA - distB;
  });
}

/**
 * Apply all filters for a specific tab
 * 
 * @param {Array} posts - Array of post objects
 * @param {string} tab - The active tab ('nearby', 'friends', 'myPosts', 'myClaims')
 * @param {Object} options - Filter options
 * @param {string} options.userId - Current user's ID
 * @param {number} options.userLat - User's latitude
 * @param {number} options.userLon - User's longitude
 * @param {Array} options.friendIds - Array of friend user IDs
 * @param {number} options.radiusKm - Radius for nearby filter (default: 25km)
 * @returns {Array} - Filtered and sorted array of posts
 */
export function filterPostsForTab(posts, tab, options = {}) {
  const { userId, userLat, userLon, friendIds = [], radiusKm = 25 } = options;
  
  // First, filter out invalid posts
  let filtered = filterValidPosts(posts);
  
  // Then apply tab-specific filter
  switch (tab) {
    case 'nearby':
      filtered = filterNearbyPosts(filtered, userLat, userLon, radiusKm);
      filtered = sortByDistance(filtered, userLat, userLon);
      break;
    
    case 'friends':
      filtered = filterFriendsPosts(filtered, friendIds);
      filtered = sortByNewest(filtered);
      break;
    
    case 'myPosts':
      filtered = filterMyPosts(filtered, userId);
      filtered = sortByNewest(filtered);
      break;
    
    case 'myClaims':
      filtered = filterMyClaims(filtered, userId);
      filtered = sortByNewest(filtered);
      break;
    
    default:
      filtered = sortByNewest(filtered);
  }
  
  return filtered;
}

/**
 * Strip large data from posts for memory optimization
 * Used for list views where full post data isn't needed
 * 
 * @param {Array} posts - Array of post objects
 * @param {string} currentUserId - Current user's ID to check if they liked the post
 * @returns {Array} - Array of posts with large data removed
 */
export function stripLargeData(posts, currentUserId = null) {
  if (!Array.isArray(posts)) return [];
  
  return posts.map(post => {
    // Remove photos and claimers arrays to reduce memory
    // Keep likedBy for checking if current user liked the post
    const { photos, claimers, ...minimalPost } = post;
    const likedBy = post.likedBy || [];
    
    return {
      ...minimalPost,
      // Keep likedBy array for like indicator to work
      likedBy: likedBy,
      // Keep count information for display
      photosCount: Array.isArray(photos) ? photos.length : 0,
      likesCount: post.likes || likedBy.length,
      claimersCount: Array.isArray(claimers) ? claimers.length : 0,
      // Add convenience flag for checking if current user liked the post
      isLikedByMe: currentUserId ? likedBy.includes(currentUserId) : false,
    };
  });
}

export default {
  isPostValid,
  filterValidPosts,
  calculateDistance,
  isPostNearby,
  filterNearbyPosts,
  filterMyPosts,
  filterMyClaims,
  filterFriendsPosts,
  sortByNewest,
  sortByDistance,
  filterPostsForTab,
  stripLargeData,
};

