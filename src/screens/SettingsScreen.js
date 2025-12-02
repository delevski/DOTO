import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
];

export default function SettingsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const language = useSettingsStore((state) => state.language);
  const toggleDarkMode = useSettingsStore((state) => state.toggleDarkMode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const t = useTranslation();

  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const handleLogout = () => {
    Alert.alert(
      t('logOut'),
      t('signOutOfAccount'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('logOut'), 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount'),
      t('areYouSureDeleteAccount'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            // In production, delete user data from InstantDB
            await logout();
          }
        },
      ]
    );
  };

  const getCurrentLanguage = () => {
    return LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  };

  const renderSettingItem = ({ 
    icon, 
    label, 
    description, 
    onPress, 
    rightElement,
    danger = false 
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: themeColors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress && !rightElement}
    >
      <View style={[
        styles.settingIcon,
        { backgroundColor: danger ? colors.errorLight : themeColors.background },
      ]}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={danger ? colors.error : colors.primary} 
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingLabel,
          { color: danger ? colors.error : themeColors.text },
        ]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {rightElement || (onPress && (
        <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Account Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
          {t('account')}
        </Text>
        
        {renderSettingItem({
          icon: 'person-outline',
          label: t('editProfile'),
          description: t('editProfileDesc'),
          onPress: () => navigation.navigate('EditProfile'),
        })}
        
        {renderSettingItem({
          icon: 'shield-checkmark-outline',
          label: t('privacySecurity'),
          description: t('privacySecurityDesc'),
          onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon'),
        })}
        
        {renderSettingItem({
          icon: 'notifications-outline',
          label: t('notifications'),
          description: t('notificationsDesc'),
          onPress: () => Alert.alert('Notifications', 'Notification settings coming soon'),
        })}
      </View>

      {/* App Preferences Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
          {t('appPreferences')}
        </Text>
        
        {renderSettingItem({
          icon: 'language-outline',
          label: t('language'),
          description: t('languageDesc'),
          onPress: () => setShowLanguageModal(true),
          rightElement: (
            <View style={styles.languageValue}>
              <Text style={[styles.languageText, { color: themeColors.textSecondary }]}>
                {getCurrentLanguage().flag} {getCurrentLanguage().name}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </View>
          ),
        })}
        
        {renderSettingItem({
          icon: darkMode ? 'moon' : 'moon-outline',
          label: t('darkMode'),
          description: t('darkModeDesc'),
          rightElement: (
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: themeColors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          ),
        })}
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.error }]}>
          {t('dangerZone')}
        </Text>
        
        {renderSettingItem({
          icon: 'log-out-outline',
          label: t('logOut'),
          description: t('signOutOfAccount'),
          onPress: handleLogout,
          danger: true,
        })}
        
        {renderSettingItem({
          icon: 'trash-outline',
          label: t('deleteAccount'),
          description: t('deleteAccountDesc'),
          onPress: handleDeleteAccount,
          danger: true,
        })}
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: colors.primary }]}>DOTO</Text>
        <Text style={[styles.appVersion, { color: themeColors.textSecondary }]}>
          Version 1.0.0
        </Text>
        <Text style={[styles.appTagline, { color: themeColors.textSecondary }]}>
          Do One Thing Others
        </Text>
      </View>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {t('language')}
              </Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  { borderBottomColor: themeColors.border },
                  language === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[styles.languageName, { color: themeColors.text }]}>
                  {lang.name}
                </Text>
                {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.md,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: typography.sm,
    marginTop: 2,
  },
  languageValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  languageText: {
    fontSize: typography.sm,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  appName: {
    fontSize: typography.xxl,
    fontWeight: '800',
  },
  appVersion: {
    fontSize: typography.sm,
    marginTop: spacing.xs,
  },
  appTagline: {
    fontSize: typography.sm,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  languageOptionActive: {
    backgroundColor: colors.errorLight,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    flex: 1,
    fontSize: typography.md,
    fontWeight: '500',
  },
});

