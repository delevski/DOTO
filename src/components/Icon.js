import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

/**
 * Icon Component
 * Wrapper around Ionicons from @expo/vector-icons
 * Browse all icons at: https://icons.expo.fyi/
 */

const ICON_COLOR = {
  active: colors.primary,
  inactive: '#9CA3AF',
};

export default function Icon({ name, size = 24, color = ICON_COLOR.inactive, style }) {
  const iconColor = color || ICON_COLOR.inactive;
  
  return (
    <View style={style}>
      <Ionicons name={name} size={size} color={iconColor} />
    </View>
  );
}

export { ICON_COLOR };
