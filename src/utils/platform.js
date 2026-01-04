import { Platform } from 'react-native';

/**
 * Get the current platform identifier
 * Returns: 'ios', 'android', or 'web'
 * @returns {string} Platform identifier
 */
export function getPlatform() {
  if (Platform.OS === 'web') {
    return 'web';
  }
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  // Fallback for unknown platforms
  return Platform.OS || 'unknown';
}

/**
 * Get platform display name
 * @returns {string} Platform display name
 */
export function getPlatformDisplayName() {
  const platform = getPlatform();
  const names = {
    ios: 'iOS',
    android: 'Android',
    web: 'Web',
    unknown: 'Unknown'
  };
  return names[platform] || platform;
}

