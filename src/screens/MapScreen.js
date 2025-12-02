import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

const { width, height } = Dimensions.get('window');

const INITIAL_REGION = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();
  const mapRef = useRef(null);

  const [region, setRegion] = useState(INITIAL_REGION);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [postsWithCoords, setPostsWithCoords] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // Fetch posts from InstantDB
  const { data } = db.useQuery({ posts: {} });
  const allPosts = data?.posts || [];

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const newRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        }
      } catch (error) {
        console.log('Location error:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Geocode posts with locations
  useEffect(() => {
    const geocodePosts = async () => {
      const postsNeedingCoords = allPosts.filter(p => p.location && !p.latitude);
      
      const geocodedPosts = await Promise.all(
        allPosts.map(async (post) => {
          if (post.latitude && post.longitude) {
            return post;
          }
          
          if (post.location) {
            try {
              // Use Nominatim API for geocoding
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(post.location)}&limit=1`
              );
              const data = await response.json();
              
              if (data && data[0]) {
                return {
                  ...post,
                  latitude: parseFloat(data[0].lat),
                  longitude: parseFloat(data[0].lon),
                };
              }
            } catch (error) {
              console.log('Geocoding error for:', post.location);
            }
          }
          
          // Generate random coords near Tel Aviv for demo
          return {
            ...post,
            latitude: 32.0853 + (Math.random() - 0.5) * 0.1,
            longitude: 34.7818 + (Math.random() - 0.5) * 0.1,
          };
        })
      );
      
      setPostsWithCoords(geocodedPosts.filter(p => p.latitude && p.longitude && !p.approvedClaimerId));
    };

    if (allPosts.length > 0) {
      geocodePosts();
    }
  }, [allPosts]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data[0]) {
        const newRegion = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      } else {
        Alert.alert('Not Found', 'Location not found. Try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const goToMyLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      Alert.alert('Error', 'Unable to get your location');
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Moving': return '#3B82F6';
      case 'Pet Care': return '#10B981';
      case 'Borrow': return '#F59E0B';
      case 'Assembly': return '#8B5CF6';
      default: return colors.primary;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {postsWithCoords.map((post) => (
          <Marker
            key={post.id}
            coordinate={{
              latitude: post.latitude,
              longitude: post.longitude,
            }}
            onPress={() => setSelectedPost(post)}
          >
            <View style={[styles.markerContainer, { backgroundColor: getCategoryColor(post.category || post.tag) }]}>
              <Ionicons 
                name={
                  post.category === 'Moving' ? 'car' :
                  post.category === 'Pet Care' ? 'paw' :
                  post.category === 'Borrow' ? 'hand-left' :
                  post.category === 'Assembly' ? 'construct' :
                  'help-circle'
                } 
                size={16} 
                color="#fff" 
              />
            </View>
            <View style={styles.markerArrow} />
          </Marker>
        ))}
      </MapView>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.surface }]}>
        <View style={[styles.searchBar, { borderColor: themeColors.border }]}>
          <Ionicons name="search-outline" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search location..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* My Location Button */}
      <TouchableOpacity 
        style={[styles.myLocationButton, { backgroundColor: themeColors.surface }]}
        onPress={goToMyLocation}
      >
        <Ionicons name="navigate" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* Posts Count */}
      <View style={[styles.postsCountBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.postsCountText}>
          {postsWithCoords.length} tasks nearby
        </Text>
      </View>

      {/* Selected Post Card */}
      {selectedPost && (
        <View style={[styles.postCard, { backgroundColor: themeColors.surface }]}>
          <TouchableOpacity 
            style={styles.closeCardButton}
            onPress={() => setSelectedPost(null)}
          >
            <Ionicons name="close" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.postCardContent}>
            <Image 
              source={{ uri: selectedPost.avatar || `https://i.pravatar.cc/150?u=${selectedPost.authorId}` }}
              style={styles.postCardAvatar}
            />
            <View style={styles.postCardInfo}>
              <Text style={[styles.postCardTitle, { color: themeColors.text }]} numberOfLines={1}>
                {selectedPost.title || 'Help Needed'}
              </Text>
              <Text style={[styles.postCardAuthor, { color: themeColors.textSecondary }]}>
                {selectedPost.author} • {formatTime(selectedPost.timestamp)}
              </Text>
              <Text style={[styles.postCardDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>
                {selectedPost.description}
              </Text>
            </View>
          </View>

          <View style={styles.postCardFooter}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(selectedPost.category || selectedPost.tag) + '20' }]}>
              <Text style={[styles.categoryBadgeText, { color: getCategoryColor(selectedPost.category || selectedPost.tag) }]}>
                {selectedPost.category || selectedPost.tag || 'Other'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => {
                setSelectedPost(null);
                navigation.navigate('PostDetails', { postId: selectedPost.id });
              }}
            >
              <Text style={styles.viewDetailsText}>{t('viewDetails')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.md,
    paddingVertical: spacing.xs,
  },
  myLocationButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 240,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  postsCountBadge: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  postsCountText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: typography.sm,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    alignSelf: 'center',
    marginTop: -2,
  },
  postCard: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.xl,
  },
  closeCardButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    zIndex: 1,
  },
  postCardContent: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  postCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  postCardInfo: {
    flex: 1,
  },
  postCardTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    marginBottom: 2,
  },
  postCardAuthor: {
    fontSize: typography.sm,
    marginBottom: spacing.xs,
  },
  postCardDescription: {
    fontSize: typography.sm,
    lineHeight: 18,
  },
  postCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryBadgeText: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  viewDetailsText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: typography.sm,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
