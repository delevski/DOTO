// Utility script to delete all posts that are not located in Israel
// This script geocodes each post's location and checks if it's within Israel bounds

import { db } from '../lib/instant';
import { isWithinIsraelBounds } from './israelBounds';

// Geocode location string to coordinates using Nominatim (restricted to Israel)
const geocodeLocation = async (locationString) => {
  if (!locationString || locationString.trim() === '') return null;
  
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: locationString,
      limit: '1',
      countrycodes: 'il',
      bounded: '1',
      viewbox: '34.2,33.5,35.9,29.4',
      addressdetails: '1'
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'DOTO-App/1.0'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      // Verify the result is within Israel bounds
      if (isWithinIsraelBounds(lat, lon)) {
        return { lat, lon, displayName: result.display_name };
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
};

// Check if a location string represents a location in Israel
const isLocationInIsrael = async (locationString) => {
  // If location is coordinates (format: "lat, lon"), parse and check directly
  const coordMatch = locationString.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    return isWithinIsraelBounds(lat, lon);
  }
  
  // Otherwise, geocode the location string
  const geocoded = await geocodeLocation(locationString);
  return geocoded !== null;
};

/**
 * Delete all posts that are not located in Israel
 * @returns {Promise<{deleted: number, total: number, errors: Array}>}
 */
export const deleteNonIsraelPosts = async () => {
  try {
    // Query all posts
    const { data } = await db.query({ posts: {} });
    const allPosts = data?.posts || [];
    
    console.log(`Found ${allPosts.length} total posts`);
    
    const postsToDelete = [];
    const errors = [];
    
    // Check each post's location
    for (const post of allPosts) {
      if (!post.location) {
        // Posts without location are considered invalid and should be deleted
        console.log(`Post ${post.id} has no location - marking for deletion`);
        postsToDelete.push(post.id);
        continue;
      }
      
      try {
        const isInIsrael = await isLocationInIsrael(post.location);
        if (!isInIsrael) {
          console.log(`Post ${post.id} (${post.location}) is NOT in Israel - marking for deletion`);
          postsToDelete.push(post.id);
        } else {
          console.log(`Post ${post.id} (${post.location}) is in Israel - keeping`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error checking post ${post.id}:`, error);
        errors.push({ postId: post.id, error: error.message });
      }
    }
    
    console.log(`\nFound ${postsToDelete.length} posts to delete`);
    
    // Delete posts in batches
    let deletedCount = 0;
    for (const postId of postsToDelete) {
      try {
        await db.transact(
          db.tx.posts[postId].delete()
        );
        deletedCount++;
        console.log(`Deleted post ${postId} (${deletedCount}/${postsToDelete.length})`);
      } catch (error) {
        console.error(`Error deleting post ${postId}:`, error);
        errors.push({ postId, error: error.message });
      }
    }
    
    return {
      deleted: deletedCount,
      total: allPosts.length,
      errors
    };
  } catch (error) {
    console.error('Error in deleteNonIsraelPosts:', error);
    throw error;
  }
};

// If running as a script (not imported), execute the function
if (import.meta.url === `file://${process.argv[1]}`) {
  deleteNonIsraelPosts()
    .then(result => {
      console.log('\n=== Summary ===');
      console.log(`Total posts: ${result.total}`);
      console.log(`Deleted: ${result.deleted}`);
      console.log(`Errors: ${result.errors.length}`);
      if (result.errors.length > 0) {
        console.log('\nErrors:', result.errors);
      }
    })
    .catch(error => {
      console.error('Failed to delete non-Israel posts:', error);
      process.exit(1);
    });
}

