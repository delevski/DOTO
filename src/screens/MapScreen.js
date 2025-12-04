import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import Map from '../components/Map';
import { filterValidPosts } from '../utils/postFilters';

function MapScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  
  // Track screen focus - only query when focused
  const isFocused = useIsFocused();
  
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryEnabled, setQueryEnabled] = useState(false);
  const [region, setRegion] = useState({
    latitude: 31.7683, // Tel Aviv center
    longitude: 35.2137,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Refs to prevent infinite loops and timeouts
  const geocodingInProgressRef = useRef(false);
  const geocodingTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // Only enable query when screen is focused
  useFocusEffect(
    useCallback(() => {
      setQueryEnabled(true);
      return () => setQueryEnabled(false);
    }, [])
  );

  // Fetch posts from InstantDB - only when authenticated AND focused
  const { isLoading: dbLoading, error: dbError, data } = db.useQuery(
    isAuthenticated && queryEnabled ? { posts: {} } : null
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (geocodingTimeoutRef.current) {
        clearTimeout(geocodingTimeoutRef.current);
      }
      geocodingInProgressRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (data?.posts) {
      // OPTIMIZED: Filter valid posts, keep only those with locations, limit to 100, strip large data
      const MAX_MAP_POSTS = 100;
      
      // First filter out expired/archived posts
      const validPosts = filterValidPosts(data.posts);
      
      // Then filter for map-specific requirements
      const mapPosts = validPosts
        .filter(post => post.location)
        .slice(0, MAX_MAP_POSTS) // Limit to 100 posts max
        .map(post => {
          // Strip out photos, likedBy, claimers, and any other large arrays
          const { photos, likedBy, claimers, ...minimalPost } = post;
          return {
            ...minimalPost,
            description: minimalPost.description?.substring(0, 100), // Truncate description
          };
        });
      
      if (mountedRef.current) {
        setPosts(mapPosts);
      setIsLoading(false);
      setError(null);
      }
    } else if (dbError) {
      if (mountedRef.current) {
      setError(dbError);
      setIsLoading(false);
      }
    } else if (dbLoading) {
      if (mountedRef.current) {
      setIsLoading(true);
      }
    }
  }, [data, dbError, dbLoading]);

  const themeColors = useMemo(() => ({
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  }), [darkMode]);

  const handleMarkerPress = useCallback((post) => {
    if (mountedRef.current) {
    setSelectedPost(post);
    }
  }, []);

  const handlePostPress = useCallback((postId) => {
    navigation.navigate('PostDetails', { postId });
  }, [navigation]);
  
  const handleRetry = useCallback(() => {
    if (mountedRef.current) {
      setError(null);
      setIsLoading(true);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            {t('map.loading') || 'Loading map...'}
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {t('map.error') || 'Error loading map'}
          </Text>
          <Text style={[styles.errorDetail, { color: themeColors.textSecondary }]}>
            {error.message || 'Please try again later'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <Map
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
        >
          {posts.map((post) => {
            // Simple coordinate extraction (you may need to geocode addresses)
            // For now, using a default location if coordinates aren't available
            const coords = post.coordinates || {
              latitude: 31.7683 + (Math.random() - 0.5) * 0.1,
              longitude: 35.2137 + (Math.random() - 0.5) * 0.1,
            };

            // Use MapMarker if available (react-native-maps), otherwise just show map
            try {
              const { MapMarker } = require('../components/Map');
              return (
                <MapMarker
                  key={post.id}
                  coordinate={coords}
                  title={post.title || t('post.helpNeeded')}
                  description={post.description?.substring(0, 100)}
                  onPress={() => handleMarkerPress(post)}
                />
              );
            } catch (e) {
              // MapMarker not available, just show map without markers
              return null;
            }
          })}
        </Map>
      </View>

      {/* Selected Post Info */}
      {selectedPost && (
        <View style={[styles.postInfo, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.postInfoHeader}>
            <Text style={[styles.postInfoTitle, { color: themeColors.text }]} numberOfLines={2}>
              {selectedPost.title || t('post.helpNeeded')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPost(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.postInfoDescription, { color: themeColors.textSecondary }]} numberOfLines={3}>
            {selectedPost.description}
          </Text>
          {selectedPost.location && (
            <Text style={[styles.postInfoLocation, { color: themeColors.textSecondary }]} numberOfLines={1}>
              📍 {selectedPost.location}
            </Text>
          )}
          <TouchableOpacity
            style={styles.viewPostButton}
            onPress={() => handlePostPress(selectedPost.id)}
          >
            <Text style={styles.viewPostButtonText}>
              {t('map.viewPost') || 'View Post'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posts List (Collapsible) */}
      {posts.length > 0 && (
        <View style={[styles.postsList, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.postsListContent}
          >
            {posts.slice(0, 10).map((post) => (
              <TouchableOpacity
                key={post.id}
                style={[styles.postCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                onPress={() => handlePostPress(post.id)}
              >
                <Text style={[styles.postCardTitle, { color: themeColors.text }]} numberOfLines={2}>
                  {post.title || t('post.helpNeeded')}
                </Text>
                {post.location && (
                  <Text style={[styles.postCardLocation, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    📍 {post.location}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(MapScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  errorDetail: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  postInfo: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  postInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  postInfoTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  postInfoDescription: {
    fontSize: 14,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  postInfoLocation: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  viewPostButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  viewPostButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postsList: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
    maxHeight: 120,
  },
  postsListContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  postCard: {
    width: 200,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  postCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  postCardLocation: {
    fontSize: 12,
  },
});
