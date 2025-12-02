// Polyfills must be imported first
import 'react-native-get-random-values';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, I18nManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import { useSettingsStore } from './src/store/settingsStore';
import { RTLProvider } from './src/context/RTLContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/styles/theme';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// App Initializer Component
function AppInitializer({ children }) {
  const [isReady, setIsReady] = useState(false);
  const initAuth = useAuthStore((state) => state.initAuth);
  const initSettings = useSettingsStore((state) => state.initSettings);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isSettingsLoading = useSettingsStore((state) => state.isLoading);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          initAuth(),
          initSettings(),
        ]);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  // Apply RTL based on language
  useEffect(() => {
    const isRTL = language === 'he';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
  }, [language]);

  if (!isReady || isAuthLoading || isSettingsLoading) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.loadingContainerDark]}>
        <Text style={styles.logo}>DOTO</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, darkMode && styles.loadingTextDark]}>
          {language === 'he' ? 'טוען...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return children;
}

// Main App Component
export default function App() {
  const darkMode = useSettingsStore((state) => state.darkMode);

  return (
    <ErrorBoundary>
      <RTLProvider>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        <AppInitializer>
          <AppNavigator />
        </AppInitializer>
      </RTLProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingContainerDark: {
    backgroundColor: colors.backgroundDark,
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadingTextDark: {
    color: colors.textSecondaryDark,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
