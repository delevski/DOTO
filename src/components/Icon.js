import React from 'react';
import { Text, StyleSheet } from 'react-native';

// Emoji-based icon replacement for Ionicons
// This avoids the ExpoFontLoader issue in Expo Go

const iconMap = {
  // Navigation
  'home': '🏠',
  'home-outline': '🏠',
  'map': '🗺️',
  'map-outline': '🗺️',
  'add': '➕',
  'add-circle': '➕',
  'chatbubbles': '💬',
  'chatbubbles-outline': '💬',
  'chatbubble': '💬',
  'chatbubble-outline': '💬',
  'chatbubble-ellipses-outline': '💬',
  'person': '👤',
  'person-outline': '👤',
  'settings': '⚙️',
  'settings-outline': '⚙️',
  
  // Actions
  'search': '🔍',
  'search-outline': '🔍',
  'close': '✕',
  'close-circle': '✕',
  'arrow-back': '←',
  'arrow-forward': '→',
  'chevron-forward': '›',
  'chevron-back': '‹',
  'send': '📤',
  'share': '↗️',
  'share-outline': '↗️',
  'pencil': '✏️',
  'pencil-outline': '✏️',
  'trash': '🗑️',
  'trash-outline': '🗑️',
  'checkmark': '✓',
  'checkmark-circle': '✓',
  'checkmark-done': '✓✓',
  'checkmark-done-circle': '✓',
  
  // Content
  'heart': '❤️',
  'heart-outline': '🤍',
  'star': '⭐',
  'star-outline': '☆',
  'location': '📍',
  'location-outline': '📍',
  'time': '🕐',
  'time-outline': '🕐',
  'calendar': '📅',
  'calendar-outline': '📅',
  'camera': '📷',
  'camera-outline': '📷',
  'image': '🖼️',
  'image-outline': '🖼️',
  'images': '🖼️',
  'images-outline': '🖼️',
  'document-text': '📄',
  'document-text-outline': '📄',
  
  // Status
  'alert-circle': '⚠️',
  'alert-circle-outline': '⚠️',
  'information-circle': 'ℹ️',
  'information-circle-outline': 'ℹ️',
  'help-circle': '❓',
  'help-circle-outline': '❓',
  'lock-closed': '🔒',
  'lock-closed-outline': '🔒',
  'eye': '👁️',
  'eye-outline': '👁️',
  'eye-off': '🙈',
  'eye-off-outline': '🙈',
  
  // User
  'mail': '📧',
  'mail-outline': '📧',
  'call': '📞',
  'call-outline': '📞',
  'log-out': '🚪',
  'log-out-outline': '🚪',
  
  // Categories
  'car': '🚗',
  'car-outline': '🚗',
  'paw': '🐾',
  'paw-outline': '🐾',
  'hand-left': '✋',
  'hand-left-outline': '✋',
  'construct': '🔧',
  'construct-outline': '🔧',
  'ellipsis-horizontal': '•••',
  'ellipsis-horizontal-outline': '•••',
  
  // Social
  'logo-google': 'G',
  'logo-facebook': 'f',
  
  // Misc
  'flash': '⚡',
  'flash-outline': '⚡',
  'navigate': '🧭',
  'navigate-outline': '🧭',
  'open': '↗️',
  'open-outline': '↗️',
  'trophy': '🏆',
  'ribbon': '🎗️',
  'shield-checkmark': '🛡️',
  'shield-checkmark-outline': '🛡️',
  'notifications': '🔔',
  'notifications-outline': '🔔',
  'moon': '🌙',
  'moon-outline': '🌙',
  'language': '🌐',
  'language-outline': '🌐',
  'filter': '⚙️',
  'filter-outline': '⚙️',
};

export default function Icon({ name, size = 20, color, style }) {
  const emoji = iconMap[name] || '•';
  
  return (
    <Text 
      style={[
        styles.icon, 
        { fontSize: size * 0.9 },
        color && { color },
        style
      ]}
    >
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});

