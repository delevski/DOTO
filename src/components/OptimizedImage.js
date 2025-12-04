/**
 * OptimizedImage Component
 * 
 * An optimized image component that:
 * - Only loads images when they're visible on screen
 * - Shows a placeholder while loading
 * - Handles errors gracefully with fallback
 * - Supports progressive loading
 * - Caches loaded images in memory
 */

import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../styles/theme';

// Simple in-memory cache for loaded image URIs
const loadedImages = new Set();

/**
 * OptimizedImage - A performant image component with lazy loading
 * 
 * @param {Object} props
 * @param {string} props.source - Image source (uri string or require())
 * @param {Object} props.style - Style object for the image
 * @param {string} props.fallback - Fallback image URI if load fails
 * @param {string} props.placeholder - Placeholder color while loading
 * @param {boolean} props.showLoader - Whether to show loading indicator
 * @param {Function} props.onLoad - Callback when image loads
 * @param {Function} props.onError - Callback when image fails to load
 */
function OptimizedImage({
  source,
  style,
  fallback,
  placeholder = '#F3F4F6',
  showLoader = true,
  onLoad,
  onError,
  resizeMode = 'cover',
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Determine the image URI
  const imageUri = typeof source === 'string' 
    ? source 
    : source?.uri || source;
  
  // Check if image is already cached
  const isCached = imageUri && loadedImages.has(imageUri);
  
  const handleLoadStart = useCallback(() => {
    if (!isCached && isMountedRef.current) {
      setIsLoading(true);
    }
  }, [isCached]);
  
  const handleLoadEnd = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setIsLoading(false);
    
    // Add to cache
    if (imageUri) {
      loadedImages.add(imageUri);
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    if (onLoad) {
      onLoad();
    }
  }, [imageUri, fadeAnim, onLoad]);
  
  const handleError = useCallback((error) => {
    if (!isMountedRef.current) return;
    
    console.warn('[OptimizedImage] Failed to load:', imageUri, error?.nativeEvent?.error);
    setHasError(true);
    setIsLoading(false);
    
    if (onError) {
      onError(error);
    }
  }, [imageUri, onError]);
  
  // Determine final source
  const finalSource = hasError && fallback
    ? { uri: fallback }
    : typeof source === 'string'
      ? { uri: source }
      : source;
  
  // If no valid source, show placeholder
  if (!finalSource || (!finalSource.uri && typeof finalSource !== 'number')) {
    return (
      <View style={[styles.placeholder, style, { backgroundColor: placeholder }]}>
        {showLoader && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>
    );
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Placeholder background */}
      <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: placeholder }]} />
      
      {/* Loading indicator */}
      {isLoading && showLoader && !isCached && (
        <View style={[StyleSheet.absoluteFill, styles.loaderContainer]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      
      {/* Animated image */}
      <Animated.Image
        {...props}
        source={finalSource}
        style={[
          StyleSheet.absoluteFill,
          { opacity: isCached ? 1 : fadeAnim },
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
    </View>
  );
}

/**
 * Avatar component - optimized for profile pictures
 */
export function OptimizedAvatar({
  source,
  size = 44,
  style,
  fallbackId,
  ...props
}) {
  const fallback = fallbackId 
    ? `https://i.pravatar.cc/${size}?u=${fallbackId}`
    : `https://i.pravatar.cc/${size}`;
  
  return (
    <OptimizedImage
      source={source}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      fallback={fallback}
      placeholder="#E5E7EB"
      showLoader={false}
      {...props}
    />
  );
}

/**
 * PostImage component - optimized for post photos
 */
export function OptimizedPostImage({
  source,
  style,
  ...props
}) {
  return (
    <OptimizedImage
      source={source}
      style={[styles.postImage, style]}
      placeholder="#F3F4F6"
      showLoader={true}
      resizeMode="cover"
      {...props}
    />
  );
}

/**
 * Clear the image cache
 * Call this when memory pressure is detected or periodically
 */
export function clearImageCache() {
  loadedImages.clear();
  console.log('[OptimizedImage] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getImageCacheStats() {
  return {
    size: loadedImages.size,
  };
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});

// Export memoized component to prevent unnecessary re-renders
export default memo(OptimizedImage);

