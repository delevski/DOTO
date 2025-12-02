import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { colors, spacing } from '../styles/theme';

export default function MapScreen() {
  const darkMode = useSettingsStore((state) => state.darkMode);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.content, { backgroundColor: themeColors.surface }]}>
        <Text style={styles.icon}>🗺️</Text>
        <Text style={[styles.title, { color: themeColors.text }]}>Map View</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Map functionality will show nearby tasks
        </Text>
        <Text style={[styles.description, { color: themeColors.textSecondary }]}>
          See posts from your community on an interactive map. Coming soon!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    borderRadius: 24,
    padding: spacing.xxxl,
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
