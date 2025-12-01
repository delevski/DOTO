// DOTO Mobile App Theme
// Matching the web app's visual style

export const colors = {
  // Primary brand colors
  primary: '#DC2626', // Red-600
  primaryLight: '#EF4444', // Red-500
  primaryDark: '#B91C1C', // Red-700
  
  // Gradient colors for buttons
  gradientStart: '#DC2626',
  gradientEnd: '#F43F5E', // Rose-500
  
  // Background colors
  background: '#F9FAFB', // Gray-50
  backgroundDark: '#111827', // Gray-900
  card: '#FFFFFF',
  cardDark: '#1F2937', // Gray-800
  
  // Text colors
  text: '#111827', // Gray-900
  textDark: '#FFFFFF',
  textSecondary: '#6B7280', // Gray-500
  textSecondaryDark: '#9CA3AF', // Gray-400
  textMuted: '#9CA3AF',
  
  // Border colors
  border: '#E5E7EB', // Gray-200
  borderDark: '#374151', // Gray-700
  
  // Input colors
  inputBg: '#F9FAFB',
  inputBgDark: '#374151',
  inputBorder: '#D1D5DB', // Gray-300
  inputBorderDark: '#4B5563', // Gray-600
  
  // Status colors
  success: '#10B981', // Green-500
  warning: '#F59E0B', // Amber-500
  error: '#EF4444', // Red-500
  info: '#3B82F6', // Blue-500
  
  // UI colors
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Category tag colors
  tagBg: '#FEE2E2', // Red-100
  tagText: '#DC2626', // Red-600
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  smallMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Common style patterns
export const commonStyles = {
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  commonStyles,
};
