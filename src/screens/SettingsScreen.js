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
import { colors, spacing, borderRadius } from '../styles/theme';

export default function SettingsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const language = useSettingsStore((state) => state.language);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'he' : 'en';
    setLanguage(newLang);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance Section */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Appearance</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: themeColors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Switch to dark theme
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

          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌐</Text>
              <View>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>Language</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  {language === 'en' ? 'English' : 'עברית'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.languageButton, { borderColor: themeColors.border }]}
              onPress={toggleLanguage}
            >
              <Text style={[styles.languageButtonText, { color: themeColors.text }]}>
                {language === 'en' ? 'EN' : 'HE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Account</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>👤</Text>
              <View>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>Edit Profile</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Update your profile information
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border }]}
            onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon.')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>Notifications</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Manage notification preferences
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0 }]}
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon.')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>Privacy</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Manage your privacy settings
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Support</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: themeColors.border }]}
            onPress={() => Alert.alert('Help Center', 'Visit our help center at help.doto.app')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>❓</Text>
              <View>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>Help Center</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Get help and support
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0 }]}
            onPress={() => Alert.alert('About DOTO', 'DOTO v1.0.0\n\nDo One Thing Others\n\nBuilding community through helping.')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <View>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>About</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Version 1.0.0
                </Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: spacing.lg,
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
  languageButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
