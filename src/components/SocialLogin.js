import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../styles/theme';

export default function SocialLogin() {
  const socialIcons = [
    { name: 'logo-facebook', color: '#3b5998' },
    { name: 'logo-linkedin', color: '#0077b5' },
    { name: 'logo-google', color: '#db4437' },
    { name: 'logo-yahoo', color: '#7B0099' },
    { name: 'logo-windows', color: '#00A4EF' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.text}>or Connect with Social</Text>
      <View style={styles.iconsContainer}>
        {socialIcons.map((icon, index) => (
          <TouchableOpacity key={index} style={styles.iconButton}>
            <Ionicons name={icon.name} size={32} color={icon.color} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  text: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconButton: {
    padding: spacing.sm,
  },
});


