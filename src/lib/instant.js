// Real InstantDB configuration for React Native
// Connected to the same database as the web app

import 'react-native-get-random-values';
import { init, id } from '@instantdb/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// InstantDB App ID - reads from environment variable with fallback to production
const APP_ID = process.env.EXPO_PUBLIC_INSTANTDB_APP_ID || 'a2f65c00-e655-46dd-bd1c-2842dece989d';

// Maximum allowed cache size in bytes (2MB)
const MAX_CACHE_SIZE = 2 * 1024 * 1024;

// Track last cache check time to avoid checking too frequently
let lastCacheCheck = 0;
const CACHE_CHECK_INTERVAL = 60000; // 1 minute between checks

/**
 * Check the size of InstantDB cache and clear if too large
 * 
 * This is a smarter approach than clearing on every interval:
 * - Only clears when cache exceeds MAX_CACHE_SIZE
 * - Checks at most once per minute
 * - Prevents OOM while preserving cache benefits
 */
async function checkAndClearCacheIfNeeded() {
  const now = Date.now();
  
  // Don't check too frequently
  if (now - lastCacheCheck < CACHE_CHECK_INTERVAL) {
    return false;
  }
  
  lastCacheCheck = now;
  
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    
    // InstantDB cache keys
    const instantKeys = allKeys.filter(key => 
      key.includes('instant') ||
      key.includes('querySubs') ||
      key.includes('pendingMutations') ||
      key.startsWith(`instant_${APP_ID}`)
    );
    
    if (instantKeys.length === 0) return false;
    
    // Estimate total cache size
    let totalSize = 0;
    const keysSample = instantKeys.slice(0, 10); // Check first 10 keys
    
    for (const key of keysSample) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      } catch (e) {
        // If we can't read it, assume it's large
        totalSize += 1000000;
      }
    }
    
    // Extrapolate total size
    const estimatedTotalSize = (totalSize / keysSample.length) * instantKeys.length;
    
    // Clear if exceeds limit
    if (estimatedTotalSize > MAX_CACHE_SIZE) {
      console.log(`[InstantDB] Cache too large (~${(estimatedTotalSize / 1024 / 1024).toFixed(1)}MB), clearing...`);
      await AsyncStorage.multiRemove(instantKeys);
      console.log(`[InstantDB] Cleared ${instantKeys.length} cache items`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('[InstantDB] Cache check failed:', error.message);
    return false;
  }
}

/**
 * Force clear all InstantDB cache (for emergency use)
 */
async function clearInstantDBCache() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    
    const instantKeys = allKeys.filter(key => 
      key.includes('instant') ||
      key.includes('querySubs') ||
      key.includes('pendingMutations') ||
      key.startsWith(`instant_${APP_ID}`)
    );
    
    if (instantKeys.length > 0) {
      await AsyncStorage.multiRemove(instantKeys);
      console.log(`[InstantDB] Force cleared ${instantKeys.length} cache items`);
    }
  } catch (error) {
    console.warn('[InstantDB] Failed to clear cache:', error.message);
    // Emergency fallback - try to clear everything InstantDB-related
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const instantKeys = allKeys.filter(key => key.includes('instant'));
      if (instantKeys.length > 0) {
        await AsyncStorage.multiRemove(instantKeys);
      }
    } catch (e) {
      console.error('[InstantDB] Emergency cache clear failed:', e.message);
    }
  }
}

// Clear cache on module load (app startup) to ensure clean state
clearInstantDBCache();

// Periodically check cache size and clear if needed (every 2 minutes)
let cacheCheckInterval = null;
if (typeof setInterval !== 'undefined') {
  cacheCheckInterval = setInterval(() => {
    checkAndClearCacheIfNeeded().catch(err => {
      console.warn('[InstantDB] Periodic cache check failed:', err.message);
    });
  }, 120000); // Check every 2 minutes
}

// Clear cache when app goes to background
if (typeof require !== 'undefined') {
  try {
    const { AppState } = require('react-native');
    if (AppState) {
      let appState = 'active';
      
      AppState.addEventListener('change', (nextAppState) => {
        // Clear cache when going to background
        if (appState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
          clearInstantDBCache().catch(err => {
            console.warn('[InstantDB] Background cache clear failed:', err.message);
          });
        }
        appState = nextAppState;
      });
    }
  } catch (e) {
    // AppState might not be available in all environments
  }
}

// Initialize InstantDB
export const db = init({ appId: APP_ID });

// Export id generator for creating new records
export { id };

// Export cache clearing function for manual use
export { clearInstantDBCache };
