import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

const { width } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyPosts, setNearbyPosts] = useState([]);

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
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.log('Location error:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Filter posts that aren't completed
  useEffect(() => {
    const activePosts = allPosts.filter(p => !p.approvedClaimerId && p.location);
    setNearbyPosts(activePosts);
  }, [allPosts]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Moving': return 'car';
      case 'Pet Care': return 'paw';
      case 'Borrow': return 'hand-left';
      case 'Assembly': return 'construct';
      default: return 'help-circle';
    }
  };

  const openInMaps = (location) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  const filteredPosts = nearbyPosts.filter(post => {
    if (!searchQuery.trim()) return true;
    return post.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           post.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Map View</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
          Find tasks near you
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.surface }]}>
        <View style={[styles.searchBar, { borderColor: themeColors.border }]}>
          <Ionicons name="search-outline" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search by location..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location Info */}
      {userLocation && (
        <View style={[styles.locationBanner, { backgroundColor: colors.successLight }]}>
          <Ionicons name="location" size={18} color={colors.success} />
          <Text style={[styles.locationText, { color: colors.success }]}>
            Location enabled • Showing tasks nearby
          </Text>
        </View>
      )}

      {/* Tasks Count */}
      <View style={styles.countBanner}>
        <Text style={[styles.countText, { color: themeColors.text }]}>
          {filteredPosts.length} active tasks in your area
        </Text>
      </View>

      {/* Posts List */}
      <ScrollView 
        style={styles.postsContainer}
        contentContainerStyle={styles.postsContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              Finding tasks near you...
            </Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="map-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No tasks found in this area
            </Text>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.postCard, { backgroundColor: themeColors.surface }]}
              onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
              activeOpacity={0.7}
            >
              <View style={styles.postHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(post.category || post.tag) + '20' }]}>
                  <Ionicons 
                    name={getCategoryIcon(post.category || post.tag)} 
                    size={16} 
                    color={getCategoryColor(post.category || post.tag)} 
                  />
                  <Text style={[styles.categoryText, { color: getCategoryColor(post.category || post.tag) }]}>
                    {post.category || post.tag || 'Other'}
                  </Text>
                </View>
                <Text style={[styles.postTime, { color: themeColors.textSecondary }]}>
                  {formatTime(post.timestamp)}
                </Text>
              </View>

              <View style={styles.postContent}>
                <Image
                  source={{ uri: post.avatar || `https://i.pravatar.cc/150?u=${post.authorId}` }}
                  style={styles.postAvatar}
                />
                <View style={styles.postInfo}>
                  <Text style={[styles.postTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {post.title || 'Help Needed'}
                  </Text>
                  <Text style={[styles.postAuthor, { color: themeColors.textSecondary }]}>
                    {post.author}
        </Text>
                </View>
              </View>

          <TouchableOpacity
                style={styles.locationRow}
                onPress={() => openInMaps(post.location)}
              >
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={[styles.locationLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>
                  {post.location}
                </Text>
                <Ionicons name="open-outline" size={14} color={colors.primary} />
          </TouchableOpacity>

              <View style={styles.postFooter}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="heart-outline" size={14} color={themeColors.textSecondary} />
                    <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
                      {post.likes || 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble-outline" size={14} color={themeColors.textSecondary} />
                    <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
                      {post.comments || 0}
                    </Text>
                  </View>
                </View>
          <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
                >
                  <Text style={styles.viewButtonText}>{t('viewDetails')}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.xxl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: typography.sm,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.sm,
    fontWeight: '500',
  },
  countBanner: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  countText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  postsContainer: {
    flex: 1,
  },
  postsContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.md,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: typography.md,
    textAlign: 'center',
  },
  postCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  categoryText: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  postTime: {
    fontSize: typography.xs,
  },
  postContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  postAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: typography.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  postAuthor: {
    fontSize: typography.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  locationLabel: {
    flex: 1,
    fontSize: typography.sm,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.sm,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: typography.sm,
    fontWeight: '600',
  },
});
