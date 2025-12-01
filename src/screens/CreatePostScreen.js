import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db, id } from '../lib/instant';
import { useAuth } from '../context/AuthContext';
import { t } from '../utils/translations';

const CATEGORIES = [
  { id: 'Moving', label: 'Moving', icon: 'cube-outline' },
  { id: 'Pet Care', label: 'Pet Care', icon: 'paw-outline' },
  { id: 'Borrow', label: 'Borrow', icon: 'swap-horizontal-outline' },
  { id: 'Assembly', label: 'Assembly', icon: 'construct-outline' },
  { id: 'Other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function CreatePostScreen({ navigation }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const descriptionRef = useRef(null);

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
      selectionLimit: 5 - photos.length,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map(asset => ({
        uri: asset.uri,
        base64: `data:image/jpeg;base64,${asset.base64}`,
      }));
      setPhotos([...photos, ...newPhotos].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 photos.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhoto = {
        uri: result.assets[0].uri,
        base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
      };
      setPhotos([...photos, newPhoto]);
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
        Alert.alert('Permission needed', 'Please enable location permissions.');
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = locationResult.coords;

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        const addressString = [
          address.streetNumber,
          address.street,
          address.city,
          address.region,
        ].filter(Boolean).join(', ');
        setLocation(addressString || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Could not get your location. Please enter it manually.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location.');
      return;
    }

    setIsSubmitting(true);

    try {
      const postId = id();
      const photoUrls = photos.map(p => p.base64);

      const newPost = {
        id: postId,
        author: user.name,
        authorId: user.id,
        avatar: user.avatar,
        title: title.trim() || 'Help Needed',
        description: description.trim(),
        location: location.trim(),
        category: category || 'Other',
        tag: category || 'Other',
        distance: 'Nearby',
        timestamp: Date.now(),
        photos: photoUrls,
        likes: 0,
        likedBy: [],
        comments: 0,
        claimers: [],
        approvedClaimerId: null,
        createdAt: Date.now(),
      };

      await db.transact(
        db.tx.posts[postId].update(newPost)
      );

      Alert.alert(
        'Success',
        'Your post has been published!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('newPost')}</Text>
        <TouchableOpacity 
          style={[styles.publishButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.publishText}>{t('publishPost')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Author Preview */}
        <View style={styles.authorPreview}>
          <Image source={{ uri: user?.avatar || 'https://i.pravatar.cc/150' }} style={styles.authorAvatar} />
          <View>
            <Text style={styles.authorName}>{user?.name || 'You'}</Text>
            <Text style={styles.authorHint}>What do you need help with?</Text>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('title')} (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief title for your post"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('description')} *</Text>
          <TextInput
            ref={descriptionRef}
            style={[styles.input, styles.textArea]}
            placeholder="Describe what you need help with..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('category')}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  category === cat.id && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={20} 
                  color={category === cat.id ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.categoryText,
                  category === cat.id && styles.categoryTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('location')} *</Text>
          <View style={styles.locationInputContainer}>
            <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.locationInput}
              placeholder="Enter address or location"
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />
            <TouchableOpacity 
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
              style={styles.locationButton}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="locate" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Photo Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addPhotos')} ({photos.length}/5)</Text>
          
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoPreview}>
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
              <View style={styles.addPhotoButtons}>
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Ionicons name="images-outline" size={28} color={colors.textSecondary} />
                  <Text style={styles.addPhotoText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
                  <Text style={styles.addPhotoText}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.submitText}>{t('publishPost')}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  publishButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  publishText: {
    ...typography.smallMedium,
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  authorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  authorName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  authorHint: {
    ...typography.small,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  categoryButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.tagBg,
  },
  categoryText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  locationInput: {
    flex: 1,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  locationButton: {
    padding: spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoPreview: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
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
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  addPhotoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bottomBar: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.button,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  submitText: {
    ...typography.button,
    color: colors.white,
  },
});

