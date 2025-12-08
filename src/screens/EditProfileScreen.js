import React, { useState, useEffect } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius } from '../styles/theme';
import { compressImage } from '../utils/imageCompression';
import { useUserProfileSync } from '../hooks/useUserProfileSync';

export default function EditProfileScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t } = useRTL();
  const { alert } = useDialog();

  // Sync user profile from InstantDB (picks up changes made from web app)
  useUserProfileSync();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isLoading, setIsLoading] = useState(false);
  
  // Update form when user data changes (from sync)
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
    }
  }, [user?.updatedAt]); // Only re-run when updatedAt changes (indicates sync)

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
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Compress the image to a small size for profile avatars
        try {
          const compressed = await compressImage(asset.uri, { 
            maxWidth: 400, 
            quality: 0.7,
            maxFileSize: 200 * 1024, // 200KB max for avatars
          });
          setAvatar(compressed.base64);
          console.log('Avatar compressed successfully');
        } catch (compressErr) {
          console.error('Image compression error:', compressErr);
          alert(t('common.error'), t('errors.failedToPickImage'));
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
      alert(t('common.error'), t('errors.failedToPickImage'));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert(t('common.required'), t('validation.enterName'));
      return;
    }

    setIsLoading(true);

    try {
      const updates = {
        name: name.trim(),
        bio: bio.trim(),
        avatar: avatar,
        updatedAt: Date.now(),
      };

      // Update in InstantDB
      await db.transact(
        db.tx.users[user.id].update(updates)
      );

      // Update local state
      await updateUser(updates);

      alert(t('common.success'), t('editProfile.profileUpdated'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Update profile error:', err);
      alert(t('common.error'), t('errors.failedToUpdateProfile'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
          Please login to edit your profile
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage}>
            <Image 
              source={{ uri: avatar || `https://i.pravatar.cc/150?u=${user.id}` }}
              style={styles.avatar}
            />
            <View style={styles.avatarOverlay}>
              <Text style={styles.avatarOverlayText}>📷</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: themeColors.surface }]}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Name</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="Your name"
              placeholderTextColor={themeColors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email (read-only) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled, { color: themeColors.textSecondary, borderColor: themeColors.border }]}
              value={user.email}
              editable={false}
            />
            <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>
              Email cannot be changed
            </Text>
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Bio</Text>
            <TextInput
              style={[styles.textArea, { color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="Tell us about yourself..."
              placeholderTextColor={themeColors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={[styles.charCount, { color: themeColors.textSecondary }]}>
              {bio.length}/200
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: themeColors.border }]}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarOverlayText: {
    fontSize: 16,
  },
  changePhotoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.md,
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
  inputDisabled: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
