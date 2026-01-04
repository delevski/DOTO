import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import { getPlatform } from '../utils/platform';
import { compressImage } from '../utils/imageCompression';

const CATEGORIES = [
  { key: 'Moving', label: 'Moving', icon: '🚚' },
  { key: 'Pet Care', label: 'Pet Care', icon: '🐾' },
  { key: 'Borrow', label: 'Borrow', icon: '🤝' },
  { key: 'Assembly', label: 'Assembly', icon: '🔧' },
  { key: 'Other', label: 'Other', icon: '📦' },
];

export default function CreatePostScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t } = useRTL();
  const { alert } = useDialog();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Other');
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Reset form when screen is focused (navigated to)
  useFocusEffect(
    useCallback(() => {
      // Reset all form fields when screen comes into focus
      setTitle('');
      setDescription('');
      setLocation('');
      setCategory('Other');
      setPhotos([]);
      setIsLoading(false);
      setIsGettingLocation(false);
      setIsCompressing(false);
    }, [])
  );

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert(t('errors.permissionNeeded'), t('errors.galleryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1, // Get full quality, we'll compress ourselves
      });

      if (!result.canceled && result.assets) {
        setIsCompressing(true);
        try {
          // Compress each image to reduce file size (target: 200-500KB)
          const compressedPhotos = await Promise.all(
            result.assets.map(async (asset) => {
              const compressed = await compressImage(asset.uri);
              return {
                uri: compressed.uri,
                base64: compressed.base64,
              };
            })
          );
          setPhotos([...photos, ...compressedPhotos].slice(0, 5)); // Max 5 photos
        } finally {
          setIsCompressing(false);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
      setIsCompressing(false);
      alert(t('common.error'), t('errors.failedToPickImage'));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert(t('errors.permissionNeeded'), t('errors.cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1, // Get full quality, we'll compress ourselves
      });

      if (!result.canceled && result.assets[0]) {
        setIsCompressing(true);
        try {
          const asset = result.assets[0];
          // Compress the image to reduce file size (target: 200-500KB)
          const compressed = await compressImage(asset.uri);
          const newPhoto = {
            uri: compressed.uri,
            base64: compressed.base64,
          };
          setPhotos([...photos, newPhoto].slice(0, 5));
        } finally {
          setIsCompressing(false);
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      setIsCompressing(false);
      alert(t('common.error'), t('errors.failedToTakePhoto'));
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert(t('errors.permissionNeeded'), t('errors.locationPermission'));
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        const parts = [];
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.region) parts.push(address.region);
        setLocation(parts.join(', ') || `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.error('Location error:', err);
      alert(t('common.error'), t('errors.failedToGetLocation'));
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert(t('common.required'), t('validation.enterDescription'));
      return;
    }

    if (!location.trim()) {
      alert(t('common.required'), t('validation.enterLocation'));
      return;
    }

    if (!user) {
      alert(t('common.error'), t('auth.pleaseLoginToCreate'));
      return;
    }

    setIsLoading(true);

    try {
      const postId = id();
      const postData = {
        id: postId,
        title: title.trim() || t('post.helpNeeded'),
        description: description.trim(),
        location: location.trim(),
        category: category,
        tag: category,
        authorId: user.id,
        author: user.name,
        avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
        photos: photos.map(p => p.base64), // Store base64 for persistence
        timestamp: Date.now(),
        createdAt: Date.now(),
        likes: 0,
        likedBy: [],
        comments: 0,
        claimers: [],
        approvedClaimerId: null,
        platform: getPlatform(), // Track platform where post was created
      };

      await db.transact(db.tx.posts[postId].update(postData));
      
      alert(t('common.success'), t('post.postCreated'), [
        { text: t('common.ok'), onPress: () => navigation.navigate('Feed') }
      ]);
    } catch (err) {
      console.error('Create post error:', err);
      alert(t('common.error'), t('errors.failedToCreatePost'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Create Post</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            Ask for help from your community
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: themeColors.surface }]}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Title (Optional)</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="What do you need help with?"
              placeholderTextColor={themeColors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Description *</Text>
            <TextInput
              style={[styles.textArea, { color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="Describe what you need help with in detail..."
              placeholderTextColor={themeColors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Category</Text>
            <View style={styles.categoriesRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryButton,
                    { borderColor: themeColors.border },
                    category === cat.key && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat.key)}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    { color: category === cat.key ? colors.primary : themeColors.textSecondary }
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Location *</Text>
            <View style={styles.locationRow}>
              <TextInput
                style={[styles.locationInput, { color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="Enter address or area"
                placeholderTextColor={themeColors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.locationButtonText}>📍</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Photos */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Photos (Optional)</Text>
            <View style={styles.photosSection}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {isCompressing && (
                <View style={styles.compressingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.compressingText, { color: themeColors.textSecondary }]}>
                    Compressing...
                  </Text>
                </View>
              )}
              {photos.length < 5 && !isCompressing && (
                <View style={styles.addPhotoButtons}>
                  <TouchableOpacity 
                    style={[styles.addPhotoButton, { borderColor: themeColors.border }]}
                    onPress={pickImage}
                  >
                    <Text style={styles.addPhotoIcon}>🖼️</Text>
                    <Text style={[styles.addPhotoText, { color: themeColors.textSecondary }]}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.addPhotoButton, { borderColor: themeColors.border }]}
                    onPress={takePhoto}
                  >
                    <Text style={styles.addPhotoIcon}>📷</Text>
                    <Text style={[styles.addPhotoText, { color: themeColors.textSecondary }]}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 50,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: spacing.xs,
  },
  formCard: {
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 120,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 20,
    gap: spacing.xs,
  },
  categoryButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#FEE2E2',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  locationButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButtonText: {
    fontSize: 20,
  },
  photosSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addPhotoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: '500',
  },
  compressingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  compressingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
