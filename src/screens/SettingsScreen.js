import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { colors, spacing, borderRadius } from '../styles/theme';

export default function SettingsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const language = useSettingsStore((state) => state.language);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const handleLogout = async () => {
    Alert.alert(
      t('auth.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('auth.logout'), 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    const newLang = language === 'en' ? 'he' : 'en';
    setLanguage(newLang);
    
    // Show alert about potential restart needed for full RTL support
    if (newLang === 'he') {
      Alert.alert(
        'שפה שונתה',
        'ייתכן שתצטרך להפעיל מחדש את האפליקציה כדי לראות את כל השינויים.',
        [{ text: 'אישור' }]
      );
    }
  };

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
              <Text style={styles.settingIcon}>🌙</Text>
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
              <Text style={styles.settingIcon}>🌐</Text>
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
                onPress={() => setLanguage('en')}
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
                onPress={() => setLanguage('he')}
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
              <Text style={styles.settingIcon}>👤</Text>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.editProfile')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.editProfileDesc')}
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary, transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => Alert.alert(t('settings.comingSoon'), t('settings.featureComingSoon', { feature: t('settings.notifications') }))}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.notifications')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.notificationsDesc')}
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary, transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0, flexDirection: rtlStyles.row }]}
            onPress={() => Alert.alert(t('settings.comingSoon'), t('settings.featureComingSoon', { feature: t('settings.privacy') }))}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.privacy')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.privacyDesc')}
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary, transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
            {t('settings.support')}
          </Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border, flexDirection: rtlStyles.row }]}
            onPress={() => Alert.alert(t('settings.helpCenter'), 'help.doto.app')}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <Text style={styles.settingIcon}>❓</Text>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.helpCenter')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.helpCenterDesc')}
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary, transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0, flexDirection: rtlStyles.row }]}
            onPress={() => Alert.alert(t('settings.about'), t('settings.aboutDoto'))}
          >
            <View style={[styles.settingInfo, { flexDirection: rtlStyles.row }]}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  {t('settings.about')}
                </Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {t('settings.version', { version: '1.0.0' })}
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary, transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
              ›
            </Text>
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
    fontSize: 24,
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
    fontSize: 24,
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
});
