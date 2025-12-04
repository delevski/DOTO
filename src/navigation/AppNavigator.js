import React, { createRef, useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { colors } from '../styles/theme';
import Icon from '../components/Icon';
import { clearInstantDBCache } from '../lib/instant';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import FeedScreen from '../screens/FeedScreen';
import MapScreen from '../screens/MapScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Modal Screens
import PostDetailsScreen from '../screens/PostDetailsScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation ref for external navigation (notifications, etc.)
export const navigationRef = createRef();

// Screen Error Boundary - prevents crashes from propagating to the entire app
class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Screen Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const darkMode = this.props.darkMode;
      return (
        <View style={[
          styles.errorContainer, 
          { backgroundColor: darkMode ? colors.backgroundDark : colors.background }
        ]}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: darkMode ? colors.textDark : colors.text }]}>
            Something went wrong
          </Text>
          <Text style={[styles.errorMessage, { color: darkMode ? colors.textSecondaryDark : colors.textSecondary }]}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// HOC to wrap screens with error boundary
const withErrorBoundary = (ScreenComponent) => {
  return React.memo((props) => {
    const darkMode = useSettingsStore((state) => state.darkMode);
    return (
      <ScreenErrorBoundary darkMode={darkMode}>
        <ScreenComponent {...props} />
      </ScreenErrorBoundary>
    );
  });
};

// Wrapped screen components with error boundaries and memoization
const SafeFeedScreen = withErrorBoundary(FeedScreen);
const SafeMapScreen = withErrorBoundary(MapScreen);
const SafeCreatePostScreen = withErrorBoundary(CreatePostScreen);
const SafeMessagesScreen = withErrorBoundary(MessagesScreen);
const SafeProfileScreen = withErrorBoundary(ProfileScreen);

// Icon name mapping for tabs
const TAB_ICONS = {
  'Feed': 'home',
  'Map': 'map',
  'Create': 'add',
  'Messages': 'chatbubbles',
  'Profile': 'person',
};

// Modern tab icon with consistent styling
const TabIcon = ({ label, focused }) => (
  <View style={styles.tabIconContainer}>
    <Icon 
      name={TAB_ICONS[label] || 'home'} 
      size={24} 
      color={focused ? colors.primary : '#9CA3AF'}
    />
  </View>
);

// Custom tab bar button for Create Post
const CreatePostButton = ({ onPress }) => (
  <TouchableOpacity
    style={styles.createButton}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.createButtonInner}>
      <Icon name="add" size={28} color="#FFFFFF" />
    </View>
  </TouchableOpacity>
);

// Bottom Tab Navigator
function MainTabs() {
  const darkMode = useSettingsStore((state) => state.darkMode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigation = useNavigation();
  
  // Don't render tabs if not authenticated (prevents crashes during logout)
  if (!isAuthenticated) {
    return null;
  }
  
  // Clear InstantDB cache when switching tabs to prevent OOM crashes
  useEffect(() => {
    let timeoutId = null;
    
    const unsubscribe = navigation.addListener('state', () => {
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Debounce cache clearing to avoid clearing too frequently
      timeoutId = setTimeout(() => {
        clearInstantDBCache().catch(err => {
          console.warn('[AppNavigator] Failed to clear cache on tab switch:', err.message);
        });
      }, 500);
    });
    
    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigation]);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: darkMode ? colors.textMutedDark : colors.textMuted,
        tabBarStyle: {
          backgroundColor: darkMode ? colors.surfaceDark : colors.surface,
          borderTopColor: darkMode ? colors.borderDark : colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        // Prevent screens from being detached (causes state issues)
        detachInactiveScreens: false,
        // Freeze inactive screens to prevent unnecessary re-renders
        freezeOnBlur: true,
      })}
      listeners={{
        tabPress: () => {
          // Clear cache immediately when a tab is pressed
          clearInstantDBCache().catch(err => {
            console.warn('[AppNavigator] Failed to clear cache on tab press:', err.message);
          });
        },
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={SafeFeedScreen}
        options={{ tabBarLabel: 'Feed', lazy: true }}
      />
      <Tab.Screen 
        name="Map" 
        component={SafeMapScreen}
        options={{ tabBarLabel: 'Map', lazy: true }}
      />
      <Tab.Screen 
        name="Create" 
        component={SafeCreatePostScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <CreatePostButton {...props} />,
          lazy: true,
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={SafeMessagesScreen}
        options={{ tabBarLabel: 'Messages', lazy: true }}
      />
      <Tab.Screen 
        name="Profile" 
        component={SafeProfileScreen}
        options={{ tabBarLabel: 'Profile', lazy: true }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main Stack (includes tabs + modal screens)
function MainStack() {
  const darkMode = useSettingsStore((state) => state.darkMode);
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: darkMode ? colors.surfaceDark : colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: darkMode ? colors.borderDark : colors.border,
        },
        headerTintColor: darkMode ? colors.textDark : colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        cardStyle: {
          backgroundColor: darkMode ? colors.backgroundDark : colors.background,
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PostDetails" 
        component={PostDetailsScreen}
        options={{ 
          title: 'Post Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={({ route }) => ({ 
          title: route.params?.userName || 'Chat',
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ 
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ 
          title: 'Edit Profile',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const darkMode = useSettingsStore((state) => state.darkMode);
  
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: darkMode,
        colors: {
          primary: colors.primary,
          background: darkMode ? colors.backgroundDark : colors.background,
          card: darkMode ? colors.surfaceDark : colors.surface,
          text: darkMode ? colors.textDark : colors.text,
          border: darkMode ? colors.borderDark : colors.border,
          notification: colors.primary,
        },
      }}
    >
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  createButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
  // Error boundary styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
