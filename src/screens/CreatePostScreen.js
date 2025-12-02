import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

const CATEGORIES = [
  { key: 'Moving', icon: 'car-outline' },
  { key: 'Pet Care', icon: 'paw-outline' },
  { key: 'Borrow', icon: 'hand-left-outline' },
  { key: 'Assembly', icon: 'construct-outline' },
  { key: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function CreatePostScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState('');

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map(asset => ({
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
      }));
      setPhotos([...photos, ...newPhotos].slice(0, 5)); // Max 5 photos
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newPhoto = {
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
      };
      setPhotos([...photos, newPhoto].slice(0, 5));
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions.');
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = locationResult.coords;

      // Reverse geocode
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (address) {
        const parts = [];
        if (address.streetNumber) parts.push(address.streetNumber);
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        
        setLocation(parts.join(' ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', t('unableToGetLocation'));
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!user) {
      setError(t('mustBeLoggedInToCreatePost'));
      return;
    }

    if (!description.trim()) {
      setError(t('pleaseEnterDescription'));
      return;
    }

    if (!location.trim()) {
      setError(t('pleaseEnterLocation'));
      return;
    }

    setIsSubmitting(true);

    try {
      const newPostId = id();
      const photoUrls = photos.map(p => p.base64 || p.uri);

      const newPost = {
        id: newPostId,
        author: user.name,
        authorId: user.id,
        avatar: user.avatar,
        title: title.trim() || t('helpNeeded'),
        description: description.trim(),
        location: location.trim(),
        category: category || 'Other',
        tag: category || 'Other',
        distance: 'Nearby',
        timestamp: Date.now(),
        photos: photoUrls,
        likes: 0,
        comments: 0,
        claimers: [],
        approvedClaimerId: null,
        createdAt: Date.now(),
      };

      await db.transact(
        db.tx.posts[newPostId].update(newPost)
      );

      Alert.alert('Success', 'Your post has been published!', [
        { text: 'OK', onPress: () => navigation.navigate('Feed') }
      ]);
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(t('failedToCreatePost'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('newPost')}</Text>
        <TouchableOpacity 
          style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>{t('publishPost')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Author Info */}
        <View style={styles.authorRow}>
          <Image 
            source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?u=user' }}
            style={styles.authorAvatar}
          />
          <View>
            <Text style={[styles.authorName, { color: themeColors.text }]}>
              {user?.name || 'You'}
            </Text>
            <Text style={[styles.authorHint, { color: themeColors.textSecondary }]}>
              {t('whatDoYouNeedHelpWith')}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('titleOptional')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }]}
            placeholder={t('briefTitleForPost')}
            placeholderTextColor={themeColors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('description')} *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }]}
            placeholder={t('descriptionPlaceholder')}
            placeholderTextColor={themeColors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: themeColors.textSecondary }]}>
            {description.length}/500 {t('characters')}
          </Text>
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  { borderColor: category === cat.key ? colors.primary : themeColors.border },
                  category === cat.key && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat.key)}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={18} 
                  color={category === cat.key ? colors.primary : themeColors.textSecondary} 
                />
                <Text style={[
                  styles.categoryText,
                  { color: category === cat.key ? colors.primary : themeColors.textSecondary }
                ]}>
                  {t(`category${cat.key.replace(' ', '')}`) || cat.key}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('location')} *</Text>
          <View style={[styles.locationInputWrapper, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Ionicons name="location-outline" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: themeColors.text }]}
              placeholder={t('enterAddressOrSelect')}
              placeholderTextColor={themeColors.textSecondary}
              value={location}
              onChangeText={setLocation}
            />
          </View>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                <Text style={styles.locationButtonText}>{t('useMyCurrentLocation')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>{t('addPhotos')}</Text>
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <View style={styles.photoActions}>
                <TouchableOpacity 
                  style={[styles.addPhotoButton, { borderColor: themeColors.border }]}
                  onPress={pickImage}
                >
                  <Ionicons name="images-outline" size={28} color={themeColors.textSecondary} />
                  <Text style={[styles.addPhotoText, { color: themeColors.textSecondary }]}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addPhotoButton, { borderColor: themeColors.border }]}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={28} color={themeColors.textSecondary} />
                  <Text style={[styles.addPhotoText, { color: themeColors.textSecondary }]}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={[styles.photoHint, { color: themeColors.textSecondary }]}>
            {t('pngJpgUpTo10MB')} ({photos.length}/5)
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 80,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: typography.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  authorName: {
    fontSize: typography.md,
    fontWeight: '600',
  },
  authorHint: {
    fontSize: typography.sm,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.md,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  charCount: {
    fontSize: typography.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  categoryScroll: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.errorLight,
  },
  categoryText: {
    fontSize: typography.sm,
    fontWeight: '500',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  locationInput: {
    flex: 1,
    fontSize: typography.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  locationButtonText: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: '500',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addPhotoText: {
    fontSize: typography.xs,
    fontWeight: '500',
  },
  photoHint: {
    fontSize: typography.xs,
    marginTop: spacing.sm,
  },
});
