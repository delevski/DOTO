import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Other');
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          base64: `data:image/jpeg;base64,${asset.base64}`,
        }));
        setPhotos([...photos, ...newPhotos].slice(0, 5)); // Max 5 photos
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newPhoto = {
          uri: asset.uri,
          base64: `data:image/jpeg;base64,${asset.base64}`,
        };
        setPhotos([...photos, newPhoto].slice(0, 5));
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'Failed to take photo');
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
        Alert.alert('Permission needed', 'Please grant location permissions.');
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
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Required', 'Please enter a location');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please login to create a post');
      return;
    }

    setIsLoading(true);

    try {
      const postId = id();
      const postData = {
        id: postId,
        title: title.trim() || 'Help Needed',
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
      };

      await db.transact(db.tx.posts[postId].update(postData));
      
      Alert.alert('Success', 'Your post has been created!', [
        { text: 'OK', onPress: () => navigation.navigate('Feed') }
      ]);
    } catch (err) {
      console.error('Create post error:', err);
      Alert.alert('Error', 'Failed to create post. Please try again.');
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
              {photos.length < 5 && (
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
