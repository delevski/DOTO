// Polyfills must be imported first
import 'react-native-get-random-values';

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, I18nManager, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './src/store/authStore';
import { useSettingsStore } from './src/store/settingsStore';
import { RTLProvider } from './src/context/RTLContext';
import { DialogProvider } from './src/context/DialogContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/styles/theme';
import { 
  registerForPushNotificationsAsync, 
  savePushTokenToUser,
  setupNotificationListeners 
} from './src/utils/notifications';
import { navigationRef } from './src/navigation/AppNavigator';

// Configure notification behavior (skip on web)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

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
  const [needsRestart, setNeedsRestart] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const initAuth = useAuthStore((state) => state.initAuth);
  const initSettings = useSettingsStore((state) => state.initSettings);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isSettingsLoading = useSettingsStore((state) => state.isLoading);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const language = useSettingsStore((state) => state.language);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Skip RTL/Updates logic on web platform
        if (Platform.OS !== 'web') {
          // First check for RTL mismatch BEFORE loading other settings
          const storedSettings = await AsyncStorage.getItem('@doto_settings');
          if (storedSettings) {
            const { language: storedLang } = JSON.parse(storedSettings);
            const shouldBeRTL = storedLang === 'he';
            
            // If there's a mismatch between native RTL and expected RTL
            if (I18nManager.isRTL !== shouldBeRTL) {
              console.log('RTL mismatch detected:', { 
                nativeRTL: I18nManager.isRTL, 
                shouldBeRTL,
                storedLang 
              });
              
              // Force RTL setting for next restart
              I18nManager.allowRTL(shouldBeRTL);
              I18nManager.forceRTL(shouldBeRTL);
              
              // Try to auto-reload the app
              setIsRestarting(true);
              try {
                await Updates.reloadAsync();
              } catch (reloadError) {
                // If auto-reload fails (e.g., in dev mode), show manual restart prompt
                console.log('Auto-reload not available:', reloadError.message);
                setIsRestarting(false);
                setNeedsRestart(true);
                setIsReady(true);
                return;
              }
            }
          }
        }
        
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

  // Register push notifications when user is logged in (skip on web)
  useEffect(() => {
    if (user?.id && Platform.OS !== 'web') {
      const registerPushNotifications = async () => {
        try {
          console.log('=== REGISTERING PUSH NOTIFICATIONS ===');
          console.log('User ID:', user.id);
          console.log('User name:', user.name);
          
          const { token, fcmToken } = await registerForPushNotificationsAsync();
          
          console.log('Got tokens:', {
            expoToken: token ? token.substring(0, 40) + '...' : 'NONE',
            fcmToken: fcmToken ? fcmToken.substring(0, 40) + '...' : 'NONE'
          });
          
          if (token || fcmToken) {
            await savePushTokenToUser(user.id, token, fcmToken);
            console.log('Push tokens SAVED for user:', user.id);
          } else {
            console.log('WARNING: No push tokens received - notifications will not work!');
          }
        } catch (error) {
          console.error('ERROR registering push notifications:', error);
        }
      };
      
      registerPushNotifications();
    }
  }, [user?.id]);

  // Set up notification listeners (skip on web)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const handleNotificationTapped = (response) => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped with data:', data);
      
      // Navigate to post if postId is provided
      if (data?.postId && navigationRef.isReady()) {
        navigationRef.navigate('PostDetails', { postId: data.postId });
      }
    };

    const subscriptions = setupNotificationListeners(
      (notification) => {
        console.log('Notification received in foreground:', notification);
      },
      handleNotificationTapped
    );

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, []);

  // Apply RTL based on language (for runtime language changes)
  useEffect(() => {
    const isRTL = language === 'he';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
  }, [language]);

  // Show restarting screen
  if (isRestarting) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.loadingContainerDark]}>
        <Text style={styles.logo}>DOTO</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, darkMode && styles.loadingTextDark]}>
          מפעיל מחדש... / Restarting...
        </Text>
      </View>
    );
  }

  // Show restart prompt if auto-reload failed
  if (needsRestart) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.loadingContainerDark]}>
        <Text style={styles.logo}>DOTO</Text>
        <Text style={[styles.restartTitle, darkMode && styles.loadingTextDark]}>
          נדרש רענון / Restart Required
        </Text>
        <Text style={[styles.restartText, darkMode && styles.loadingTextDark]}>
          אנא סגור ופתח מחדש את האפליקציה{'\n'}
          Please close and reopen the app
        </Text>
      </View>
    );
  }

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
        <DialogProvider>
          <StatusBar style={darkMode ? 'light' : 'dark'} />
          <AppInitializer>
            <AppNavigator />
          </AppInitializer>
        </DialogProvider>
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
  restartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  restartText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
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
