/**
 * Get the current platform identifier
 * Returns: 'ios', 'android', or 'web'
 * @returns {string} Platform identifier
 */
export function getPlatform() {
  // Web app always returns 'web'
  return 'web';
}

/**
 * Get platform display name
 * @returns {string} Platform display name
 */
export function getPlatformDisplayName() {
  return 'Web';
}

