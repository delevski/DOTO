/**
 * Size-limited AsyncStorage adapter for InstantDB
 * 
 * This prevents OutOfMemoryError crashes by limiting the size of data
 * that InstantDB can cache to AsyncStorage.
 * 
 * InstantDB caches all query results (including posts with base64 images)
 * which can cause 50MB+ allocations and crash the app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Maximum size for a single item (in characters)
const MAX_ITEM_SIZE = 500000; // 500KB limit per item

// Maximum total cache size (in characters)
const MAX_TOTAL_SIZE = 2000000; // 2MB total limit

class LimitedStorage {
  constructor(prefix) {
    this.prefix = prefix || 'instant';
    this.keyPrefix = `@${this.prefix}_`;
  }

  _getKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  async getItem(key) {
    try {
      const fullKey = this._getKey(key);
      const value = await AsyncStorage.getItem(fullKey);
      return value;
    } catch (error) {
      console.warn('LimitedStorage getItem error:', error.message);
      // If we get an OOM error reading, clear the corrupted cache
      if (error.message && error.message.includes('OutOfMemory')) {
        await this._clearCache();
      }
      return null;
    }
  }

  async setItem(key, value) {
    try {
      // Skip storing if value is too large
      if (typeof value === 'string' && value.length > MAX_ITEM_SIZE) {
        console.warn(
          `LimitedStorage: Skipping storage of '${key}' - size ${value.length} exceeds limit ${MAX_ITEM_SIZE}`
        );
        return;
      }

      // Check for base64 image data in the value (they're huge)
      if (typeof value === 'string' && this._containsBase64Image(value)) {
        console.warn(
          `LimitedStorage: Skipping storage of '${key}' - contains base64 image data`
        );
        return;
      }

      const fullKey = this._getKey(key);
      await AsyncStorage.setItem(fullKey, value);
    } catch (error) {
      console.warn('LimitedStorage setItem error:', error.message);
      // If we get an OOM error, try to clear the cache
      if (error.message && error.message.includes('OutOfMemory')) {
        await this._clearCache();
      }
    }
  }

  async removeItem(key) {
    try {
      const fullKey = this._getKey(key);
      await AsyncStorage.removeItem(fullKey);
    } catch (error) {
      console.warn('LimitedStorage removeItem error:', error.message);
    }
  }

  /**
   * Check if a string contains base64 image data
   * Base64 images typically start with "data:image/" or contain very long alphanumeric strings
   */
  _containsBase64Image(value) {
    // Check for data URI prefix
    if (value.includes('data:image/')) {
      return true;
    }
    
    // Check for very long base64-like strings (base64 encoded images are usually > 10KB)
    // This pattern matches long sequences of base64 characters
    const base64Pattern = /[A-Za-z0-9+/=]{10000,}/;
    return base64Pattern.test(value);
  }

  /**
   * Clear all cached data for this prefix
   */
  async _clearCache() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const ourKeys = allKeys.filter(key => key.startsWith(this.keyPrefix));
      
      if (ourKeys.length > 0) {
        console.log(`LimitedStorage: Clearing ${ourKeys.length} cached items`);
        await AsyncStorage.multiRemove(ourKeys);
      }
    } catch (error) {
      console.error('LimitedStorage: Failed to clear cache:', error.message);
    }
  }

  /**
   * Get total size of cached data
   */
  async getCacheSize() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const ourKeys = allKeys.filter(key => key.startsWith(this.keyPrefix));
      
      let totalSize = 0;
      for (const key of ourKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}

export default LimitedStorage;

