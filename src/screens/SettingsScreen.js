import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { colors, spacing, borderRadius } from '../styles/theme';
import Icon from '../components/Icon';
import { db } from '../lib/instant';
import { hashPassword, verifyPassword } from '../utils/password';
import { registerForPushNotificationsAsync } from '../utils/notifications';

export default function SettingsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const language = useSettingsStore((state) => state.language);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  const { alert } = useDialog();
  
  // Track mounted state for cleanup
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Only query when authenticated and we have a user
  const shouldQuery = isAuthenticated && user?.id;

  // Query user to get passwordHash
  const { data: userData } = db.useQuery(shouldQuery ? {
    users: { $: { where: { id: user.id } } }
  } : null);
  
  const userRecord = useMemo(() => {
    try {
      return userData?.users?.[0] || null;
    } catch (e) {
      return null;
    }
  }, [userData?.users]);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const handleLogout = async () => {
    alert(
      t('auth.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('auth.logout'), 
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    const newLang = language === 'en' ? 'he' : 'en';
    setLanguage(newLang, user?.id);
    
    // Show alert about potential restart needed for full RTL support
    if (newLang === 'he') {
      alert(
        'שפה שונתה',
        'ייתכן שתצטרך להפעיל מחדש את האפליקציה כדי לראות את כל השינויים.'
      );
    }
  };

  // Debug: Test push notifications
  const testPushNotifications = async () => {
    try {
      // Check current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Current notification permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('New permission status after request:', finalStatus);
      }
      
      if (finalStatus !== 'granted') {
        alert(
          t('errors.permissionDenied'),
          `Notification permission status: ${finalStatus}\n\nPlease enable notifications in your device settings:\nSettings → Apps → DOTO → Notifications`
        );
        return;
      }
      
      // Get push token
      const token = await registerForPushNotificationsAsync();
      console.log('Push token result:', token);
      
      if (token) {
        // Schedule a local test notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🎉 Test Notification",
            body: "Push notifications are working on your G-24!",
            data: { test: true },
          },
          trigger: { seconds: 2 },
        });
        
        alert(
          t('common.success'),
          `Push token: ${token.substring(0, 30)}...\n\nA test notification will appear in 2 seconds!`
        );
      } else {
        alert(
          t('common.error'),
          'Could not get push token. Check:\n\n1. Are you using Expo Go or a development build?\n2. Is the device connected to internet?\n3. Check console logs for errors.'
        );
      }
    } catch (error) {
      console.error('Test notification error:', error);
      alert(
        t('common.error'),
        `Failed to test notifications:\n${error.message}`
      );
    }
  };

  const resetPasswordModal = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  }, []);

  const handleOpenPasswordModal = useCallback(() => {
    // Check if user has password authentication
    if (!userRecord?.passwordHash && user?.authProvider !== 'email') {
      alert(
        t('settings.cannotChangePassword'),
        t('settings.socialLoginPasswordInfo')
      );
      return;
    }
    resetPasswordModal();
    setShowPasswordModal(true);
  }, [userRecord, user, t, resetPasswordModal]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError('');

    // Validation
    if (!currentPassword) {
      setPasswordError(t('validation.enterCurrentPassword') || 'Please enter your current password');
      return;
    }

    if (!newPassword) {
      setPasswordError(t('validation.enterNewPassword') || 'Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('validation.passwordMinLength') || 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(t('validation.passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(t('validation.passwordMustBeDifferent') || 'New password must be different from current password');
      return;
    }

    setIsChangingPassword(true);

    try {
      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, userRecord?.passwordHash);
      
      if (!isValidPassword) {
        setPasswordError(t('auth.incorrectPassword') || 'Current password is incorrect');
        setIsChangingPassword(false);
        return;
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password in database
      await db.transact(
        db.tx.users[user.id].update({
          passwordHash: newPasswordHash,
          passwordUpdatedAt: Date.now(),
        })
      );

      // Close modal and show success
      setShowPasswordModal(false);
      resetPasswordModal();
      
      alert(
        t('settings.passwordChanged'),
        t('settings.passwordChangedSuccess')
      );
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(t('errors.tryAgain') || 'Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmNewPassword, userRecord, user, t, resetPasswordModal]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance Section */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
            {t('settings.appearance')}
          </Text>
          
          <View style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}>
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="moon" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.darkMode')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.darkModeDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E7EB', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0, flexDirection: rtlStyles.row }]}
            onPress={handleLanguageChange}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="language" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.language')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {language === 'en' ? 'English' : 'עברית'}
                </Text>
              </View>
            </View>
            <View style={[styles.languageSelector, { flexDirection: rtlStyles.row }]}>
              <TouchableOpacity 
                style={[
                  styles.langOption,
                  language === 'en' && styles.langOptionActive,
                ]}
                onPress={() => setLanguage('en', user?.id)}
              >
                <Text style={[
                  styles.langOptionText,
                  language === 'en' && styles.langOptionTextActive
                ]}>
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.langOption,
                  language === 'he' && styles.langOptionActive,
                ]}
                onPress={() => setLanguage('he', user?.id)}
              >
                <Text style={[
                  styles.langOptionText,
                  language === 'he' && styles.langOptionTextActive
                ]}>
                  עב
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
            {t('settings.account')}
          </Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="person" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.editProfile')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.editProfileDesc')}
                </Text>
              </View>
            </View>
            <View style={[styles.settingArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => alert(t('settings.comingSoon'), t('settings.featureComingSoon', { feature: t('settings.notifications') }))}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="notifications" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.notifications')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.notificationsDesc')}
                </Text>
              </View>
            </View>
            <View style={[styles.settingArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => alert(t('settings.comingSoon'), t('settings.featureComingSoon', { feature: t('settings.privacy') }))}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="lock-closed" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.privacy')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.privacyDesc')}
                </Text>
              </View>
            </View>
            <View style={[styles.settingArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0, flexDirection: rtlStyles.row }]}
            onPress={handleOpenPasswordModal}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="key" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.changePassword') || 'Change Password'}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.changePasswordDesc') || 'Update your account password'}
                </Text>
              </View>
            </View>
            <View style={[styles.settingArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
            {t('settings.support')}
          </Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => alert(t('settings.helpCenter'), 'help.doto.app')}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="help-circle" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.helpCenter')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.helpCenterDesc')}
                </Text>
              </View>
            </View>
            <View style={[styles.settingArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => alert(t('settings.about'), t('settings.aboutDoto'))}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={styles.settingIcon}>
                <Icon name="information-circle" size={22} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.about')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.version', { version: '1.0.0' })}
                </Text>
              </View>
            </View>
            <View style={[styles.settingArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Debug: Test Push Notifications */}
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0, flexDirection: rtlStyles.row }]}
            onPress={testPushNotifications}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <View style={[styles.settingIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <Icon name="bug" size={22} color="#22C55E" />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  🧪 Test Notifications
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Debug: Check if push notifications work
                </Text>
              </View>
            </View>
            <View style={[styles.settingArrow, { transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              <Icon name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
            DOTO © 2024
          </Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                {t('settings.changePassword') || 'Change Password'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowPasswordModal(false);
                  resetPasswordModal();
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {passwordError ? (
              <View style={styles.modalErrorBox}>
                <Text style={[styles.modalErrorText, { textAlign: rtlStyles.textAlign }]}>{passwordError}</Text>
              </View>
            ) : null}

            {/* Current Password */}
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                {t('settings.currentPassword') || 'Current Password'}
              </Text>
              <View style={[styles.modalInputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                <TextInput
                  style={[styles.modalInput, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                  placeholder={t('settings.enterCurrentPassword') || 'Enter current password'}
                  placeholderTextColor={themeColors.textSecondary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  editable={!isChangingPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  <Text style={styles.modalInputIcon}>{showCurrentPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                {t('settings.newPassword') || 'New Password'}
              </Text>
              <View style={[styles.modalInputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                <TextInput
                  style={[styles.modalInput, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                  placeholder={t('settings.enterNewPassword') || 'Enter new password'}
                  placeholderTextColor={themeColors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  editable={!isChangingPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Text style={styles.modalInputIcon}>{showNewPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                {t('settings.confirmNewPassword') || 'Confirm New Password'}
              </Text>
              <View style={[styles.modalInputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                <TextInput
                  style={[styles.modalInput, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                  placeholder={t('settings.reenterNewPassword') || 'Re-enter new password'}
                  placeholderTextColor={themeColors.textSecondary}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showNewPassword}
                  editable={!isChangingPassword}
                />
              </View>
            </View>

            {/* Buttons */}
            <View style={[styles.modalButtons, { flexDirection: rtlStyles.row }]}>
              <TouchableOpacity
                style={[styles.modalButtonSecondary, { borderColor: themeColors.border }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  resetPasswordModal();
                }}
                disabled={isChangingPassword}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: themeColors.text }]}>
                  {t('common.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, isChangingPassword && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>
                    {t('settings.changePassword') || 'Change Password'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  settingItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingInfo: {
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  settingArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageSelector: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  langOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F3F4F6',
  },
  langOptionActive: {
    backgroundColor: colors.primary,
  },
  langOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langOptionTextActive: {
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 13,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalCloseText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  modalErrorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  modalErrorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  modalInputGroup: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalInputWrapper: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  modalInputIcon: {
    fontSize: 18,
  },
  modalButtons: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
