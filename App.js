import React from 'react';
import { Platform, UIManager, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Platform-specific web fix
if (Platform.OS === 'web') {
  if (UIManager) {
    UIManager.getViewManagerConfig = UIManager.getViewManagerConfig || ((name) => {
      return {};
    });
  }
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
