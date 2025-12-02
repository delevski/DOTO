export const colors = {
  // Primary - Red/Rose gradient
  primary: '#DC2626',
  primaryDark: '#B91C1C',
  primaryLight: '#EF4444',
  rose: '#F43F5E',
  
  // Backgrounds
  background: '#F9FAFB',
  backgroundDark: '#111827',
  surface: '#FFFFFF',
  surfaceDark: '#1F2937',
  
  // Text
  text: '#111827',
  textDark: '#F9FAFB',
  textSecondary: '#6B7280',
  textSecondaryDark: '#9CA3AF',
  textMuted: '#9CA3AF',
  textMutedDark: '#6B7280',
  
  // Borders
  border: '#E5E7EB',
  borderDark: '#374151',
  
  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Social
  google: '#4285F4',
  facebook: '#1877F2',
  
  // Ratings
  star: '#FBBF24',
  
  // Gradients (for LinearGradient)
  gradientPrimary: ['#DC2626', '#F43F5E'],
  gradientSuccess: ['#10B981', '#34D399'],
  gradientInfo: ['#3B82F6', '#60A5FA'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const typography = {
  // Font sizes
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,
  
  // Font weights
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
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
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Helper to get theme colors based on dark mode
export const getThemeColors = (darkMode) => ({
  background: darkMode ? colors.backgroundDark : colors.background,
  surface: darkMode ? colors.surfaceDark : colors.surface,
  text: darkMode ? colors.textDark : colors.text,
  textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
  textMuted: darkMode ? colors.textMutedDark : colors.textMuted,
  border: darkMode ? colors.borderDark : colors.border,
});

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  getThemeColors,
};
