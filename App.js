import React from 'react';
import { Platform, UIManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

if (Platform.OS === 'web') {
  if (UIManager) {
    UIManager.getViewManagerConfig = UIManager.getViewManagerConfig || ((name) => {
      return {};
    });
  }
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}


