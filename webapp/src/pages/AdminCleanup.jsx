// Admin page to delete all posts that are not located in Israel
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/instant';
import { isWithinIsraelBounds } from '../utils/israelBounds';

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

export default function AdminCleanup() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [postsToDelete, setPostsToDelete] = useState([]);
  
  // Query all posts
  const { data, isLoading } = db.useQuery({ posts: {} });
  const allPosts = data?.posts || [];

  const handleCleanup = async () => {
    if (!window.confirm(`Are you sure you want to delete all posts not located in Israel?\n\nThis will check ${allPosts.length} posts and delete those outside Israel bounds.`)) {
      return;
    }

    setIsRunning(true);
    setStatus('Starting cleanup...');
    setProgress({ current: 0, total: allPosts.length });
    setResults(null);
    setPostsToDelete([]);

    const postsToDeleteList = [];
    const errors = [];

    try {
      // Check each post's location
      for (let i = 0; i < allPosts.length; i++) {
        const post = allPosts[i];
        setProgress({ current: i + 1, total: allPosts.length });
        setStatus(`Checking post ${i + 1}/${allPosts.length}: ${post.location || 'No location'}`);

        if (!post.location) {
          // Posts without location are considered invalid and should be deleted
          console.log(`Post ${post.id} has no location - marking for deletion`);
          postsToDeleteList.push({ id: post.id, location: 'No location', reason: 'Missing location' });
          continue;
        }

        try {
          const isInIsrael = await isLocationInIsrael(post.location);
          if (!isInIsrael) {
            console.log(`Post ${post.id} (${post.location}) is NOT in Israel - marking for deletion`);
            postsToDeleteList.push({ id: post.id, location: post.location, reason: 'Not in Israel' });
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error checking post ${post.id}:`, error);
          errors.push({ postId: post.id, error: error.message });
        }
      }

      setPostsToDelete(postsToDeleteList);
      setStatus(`Found ${postsToDeleteList.length} posts to delete. Deleting...`);

      // Delete posts
      let deletedCount = 0;
      for (let i = 0; i < postsToDeleteList.length; i++) {
        const { id: postId } = postsToDeleteList[i];
        setProgress({ current: i + 1, total: postsToDeleteList.length });
        setStatus(`Deleting post ${i + 1}/${postsToDeleteList.length}...`);

        try {
          await db.transact(
            db.tx.posts[postId].delete()
          );
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting post ${postId}:`, error);
          errors.push({ postId, error: error.message });
        }
      }

      setResults({
        deleted: deletedCount,
        total: allPosts.length,
        errors
      });
      setStatus(`Cleanup complete! Deleted ${deletedCount} posts.`);
    } catch (error) {
      console.error('Error in cleanup:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin: Cleanup Non-Israel Posts</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This tool will check all {allPosts.length} posts and delete those that are not located in Israel.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Posts are checked by geocoding their location string. Posts without a location or with locations outside Israel bounds (lat: 29.4-33.5, lon: 34.2-35.9) will be deleted.
          </p>
        </div>

        {status && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-blue-700 dark:text-blue-400 font-medium">{status}</p>
            {progress.total > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {progress.current} / {progress.total}
                </p>
              </div>
            )}
          </div>
        )}

        {postsToDelete.length > 0 && !isRunning && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Posts to be deleted ({postsToDelete.length}):
            </h2>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {postsToDelete.map((post) => (
                <div
                  key={post.id}
                  className="p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Post ID: {post.id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Location: {post.location}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">Reason: {post.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">Results</h2>
            <p className="text-green-700 dark:text-green-400">
              Total posts checked: {results.total}
            </p>
            <p className="text-green-700 dark:text-green-400">
              Posts deleted: {results.deleted}
            </p>
            {results.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-600 dark:text-red-400 font-medium">Errors: {results.errors.length}</p>
                <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                  {results.errors.map((err, idx) => (
                    <li key={idx}>Post {err.postId}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleCleanup}
          disabled={isRunning || allPosts.length === 0}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? 'Running Cleanup...' : `Delete Non-Israel Posts (${allPosts.length} total)`}
        </button>
      </div>
    </div>
  );
}

