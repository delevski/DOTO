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
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
// DateTimePicker - conditionally loaded to prevent crash if native module not linked
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  console.warn('DateTimePicker native module not available - will use fallback');
}
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import { compressImage } from '../utils/imageCompression';
import Icon from '../components/Icon';

const EVENT_CATEGORIES = [
  { key: 'social', label: 'Social Meetup', labelHe: 'מפגש חברתי', icon: '🎉' },
  { key: 'sports', label: 'Sports', labelHe: 'ספורט', icon: '⚽' },
  { key: 'volunteering', label: 'Volunteering', labelHe: 'התנדבות', icon: '🤝' },
  { key: 'workshop', label: 'Workshop', labelHe: 'סדנה', icon: '🎨' },
  { key: 'culture', label: 'Culture', labelHe: 'תרבות', icon: '🎭' },
  { key: 'other', label: 'Other', labelHe: 'אחר', icon: '📌' },
];

export default function CreateCommunityEventScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const { alert } = useDialog();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('social');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState(new Date());
  const [maxParticipants, setMaxParticipants] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Reset form when screen is focused
  useFocusEffect(
    useCallback(() => {
      setTitle('');
      setDescription('');
      setLocation('');
      setCategory('social');
      setEventDate(new Date());
      setEventTime(new Date());
      setMaxParticipants('');
      setCoverImage(null);
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
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setIsCompressing(true);
        try {
          const compressed = await compressImage(result.assets[0].uri);
          setCoverImage({
            uri: compressed.uri,
            base64: compressed.base64,
          });
        } finally {
          setIsCompressing(false);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
      setIsCompressing(false);
      alert(t('common.error'), t('errors.failedToPickImage') || 'Failed to pick image');
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
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
      alert(t('common.error'), t('errors.failedToGetLocation') || 'Failed to get location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEventTime(selectedTime);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert(t('common.required') || 'Required', t('events.pleaseEnterEventTitle') || 'Please enter an event title');
      return;
    }

    if (!description.trim()) {
      alert(t('common.required') || 'Required', t('validation.enterDescription'));
      return;
    }

    if (!location.trim()) {
      alert(t('common.required') || 'Required', t('validation.enterLocation'));
      return;
    }

    if (!user) {
      alert(t('common.error'), t('events.mustBeLoggedInToCreateEvent') || 'You must be logged in to create an event');
      return;
    }

    setIsLoading(true);

    try {
      const eventId = id();
      
      // Combine date and time
      const eventDateTime = new Date(eventDate);
      eventDateTime.setHours(eventTime.getHours(), eventTime.getMinutes(), 0, 0);

      const eventData = {
        id: eventId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category: category,
        eventDate: eventDate.toISOString().split('T')[0],
        eventTime: `${eventTime.getHours().toString().padStart(2, '0')}:${eventTime.getMinutes().toString().padStart(2, '0')}`,
        eventDateTime: eventDateTime.getTime(),
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        coverImage: coverImage?.base64 || null,
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
        subscribers: [],
        blockedUsers: [],
        status: 'upcoming',
        likesCount: 0,
        likedBy: [],
        commentsCount: 0,
        timestamp: Date.now(),
        createdAt: Date.now(),
      };

      await db.transact(db.tx.communityEvents[eventId].update(eventData));
      
      alert(t('common.success'), t('events.eventCreated') || 'Event created successfully!', [
        { text: t('common.ok'), onPress: () => navigation.navigate('Feed') }
      ]);
    } catch (err) {
      console.error('Create event error:', err);
      alert(t('common.error'), t('events.failedToCreateEvent') || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.headerIconContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>✨</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('events.newCommunityEvent') || 'New Community Event'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('events.createEventSubtitle') || 'Bring your community together'}
              </Text>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: themeColors.surface }]}>
          {/* Cover Image */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('events.coverImage') || 'Cover Image'}
            </Text>
            {coverImage ? (
              <View style={styles.coverImageContainer}>
                <Image source={{ uri: coverImage.uri }} style={styles.coverImagePreview} />
                <TouchableOpacity style={styles.removeCoverButton} onPress={removeCoverImage}>
                  <Icon name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.uploadButton, { borderColor: themeColors.border }]}
                onPress={pickImage}
                disabled={isCompressing}
              >
                {isCompressing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text style={styles.uploadIcon}>🖼️</Text>
                    <Text style={[styles.uploadText, { color: themeColors.textSecondary }]}>
                      {t('events.uploadCoverImage') || 'Upload Cover Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('events.eventTitle') || 'Event Title'} *
            </Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('events.eventTitlePlaceholder') || 'Give your event a catchy title...'}
              placeholderTextColor={themeColors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('post.descriptionRequired') || 'Description *'}
            </Text>
            <TextInput
              style={[styles.textArea, { color: themeColors.text, borderColor: themeColors.border, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('events.eventDescriptionPlaceholder') || 'Describe your event...'}
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
            <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('events.eventCategory') || 'Category'}
            </Text>
            <View style={[styles.categoriesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {EVENT_CATEGORIES.map((cat) => (
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
                    { color: category === cat.key ? '#9333EA' : themeColors.textSecondary }
                  ]}>
                    {isRTL ? cat.labelHe : cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('events.eventDate') || 'Event Date'} *
              </Text>
              <TouchableOpacity 
                style={[styles.dateTimeButton, { borderColor: themeColors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar-outline" size={20} color="#9333EA" />
                <Text style={[styles.dateTimeText, { color: themeColors.text }]}>
                  {formatDate(eventDate)}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('events.eventTime') || 'Event Time'} *
              </Text>
              <TouchableOpacity 
                style={[styles.dateTimeButton, { borderColor: themeColors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="time-outline" size={20} color="#9333EA" />
                <Text style={[styles.dateTimeText, { color: themeColors.text }]}>
                  {formatTime(eventTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && DateTimePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && DateTimePicker && (
            <DateTimePicker
              value={eventTime}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {/* Max Participants */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('events.maxParticipants') || 'Max Participants'} ({t('events.optional') || 'Optional'})
            </Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('events.unlimitedParticipants') || 'Leave empty for unlimited'}
              placeholderTextColor={themeColors.textSecondary}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="number-pad"
            />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('post.locationRequired') || 'Location *'}
            </Text>
            <View style={[styles.locationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TextInput
                style={[styles.locationInput, { color: themeColors.text, borderColor: themeColors.border, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('post.locationPlaceholder') || 'Enter address or area'}
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
                  <Icon name="location" size={20} color="#fff" />
                )}
              </TouchableOpacity>
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
            <View style={[styles.submitContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.submitIcon}>✨</Text>
              <Text style={styles.submitButtonText}>
                {t('events.createEvent') || 'Create Event'}
              </Text>
            </View>
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
    paddingTop: 20,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerIconContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
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
    minHeight: 100,
  },
  coverImageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  removeCoverButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesRow: {
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
    marginBottom: spacing.xs,
  },
  categoryButtonActive: {
    borderColor: '#9333EA',
    backgroundColor: '#F3E8FF',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationRow: {
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
    backgroundColor: '#9333EA',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#9333EA',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  submitIcon: {
    fontSize: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});




