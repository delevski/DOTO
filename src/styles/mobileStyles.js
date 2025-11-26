import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography } from './theme';

/**
 * Mobile App Styles
 * Comprehensive style definitions for React Native mobile app
 * Provides reusable component styles, layout utilities, and screen-specific styles
 */

// ============================================================================
// COMMON COMPONENT STYLES
// ============================================================================

export const commonStyles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  containerLight: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  contentContainerNoPadding: {
    flex: 1,
  },

  // Background Overlay
  backgroundOverlay: {
    flex: 1,
  },
  gradientOverlay: {
    flex: 1,
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.darkSecondary,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.white,
    textAlign: 'center',
  },

  // Logo Styles
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
  },
  logoSmall: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },

  // Button Styles
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutlineText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSmall: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmallText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: colors.darkSecondary,
    opacity: 0.5,
  },
  buttonDisabledText: {
    color: colors.textSecondary,
  },

  // Input Styles
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.white,
    fontSize: 16,
  },
  inputLight: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.overlayText,
    backgroundColor: colors.white,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  textAreaLight: {
    height: 100,
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.overlayText,
    backgroundColor: colors.white,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  labelLight: {
    color: colors.overlayText,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  // Link Styles
  link: {
    color: '#4A90E2',
    fontSize: 14,
  },
  linkText: {
    color: '#4A90E2',
    fontSize: 14,
    textAlign: 'right',
  },
  linkCenter: {
    color: '#4A90E2',
    fontSize: 14,
    textAlign: 'center',
  },

  // Card Styles
  card: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardLight: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Avatar Styles
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
  },
  avatarTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },

  // Badge/Count Styles
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Progress Bar Styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.darkSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Divider Styles
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.md,
  },
  dividerLight: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: spacing.md,
  },

  // Icon Button Styles
  iconButton: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  iconButtonLarge: {
    padding: spacing.md,
    borderRadius: 12,
  },
});

// ============================================================================
// SCREEN-SPECIFIC STYLES
// ============================================================================

export const screenStyles = StyleSheet.create({
  // Auth Screens (Login, Register, ForgotPassword)
  authContainer: {
    flex: 1,
  },
  authOverlay: {
    flex: 1,
  },
  authContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  authTitle: {
    ...typography.h1,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  authForm: {
    flex: 1,
  },
  authButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  authButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  authLinkContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },

  // Profile Screen
  profileHeader: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  profileRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  profileRatingText: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  profilePercentage: {
    fontSize: 18,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  profileMenu: {
    paddingHorizontal: spacing.lg,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: spacing.md,
  },
  profileMenuItemText: {
    fontSize: 18,
    color: colors.white,
    flex: 1,
  },
  profileMenuItemTextDisabled: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  profileMenuItemCount: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },

  // Map Screen
  mapContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  map: {
    flex: 1,
  },
  mapFooter: {
    backgroundColor: colors.darkSecondary,
    padding: spacing.md,
  },
  mapLocationText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  mapFooterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapFooterButton: {
    padding: spacing.sm,
  },
  mapPostButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'center',
  },
  mapPostButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Post Create Screen
  postCreateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  postCreateModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  postCreateLocationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  postCreateLocationInput: {
    flex: 1,
  },
  postCreateLocationButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    justifyContent: 'center',
  },
  postCreateLocationButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },

  // Search Screen
  searchContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  searchBar: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});

// ============================================================================
// LAYOUT UTILITIES
// ============================================================================

export const layoutStyles = StyleSheet.create({
  // Flex Utilities
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  flexColumn: { flexDirection: 'column' },
  flexCenter: { alignItems: 'center', justifyContent: 'center' },
  flexBetween: { justifyContent: 'space-between' },
  flexAround: { justifyContent: 'space-around' },
  flexEvenly: { justifyContent: 'space-evenly' },
  flexStart: { justifyContent: 'flex-start' },
  flexEnd: { justifyContent: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  alignCenter: { alignItems: 'center' },
  alignStretch: { alignItems: 'stretch' },
  justifyCenter: { justifyContent: 'center' },
  justifyBetween: { justifyContent: 'space-between' },
  justifyAround: { justifyContent: 'space-around' },
  justifyEvenly: { justifyContent: 'space-evenly' },
  justifyStart: { justifyContent: 'flex-start' },
  justifyEnd: { justifyContent: 'flex-end' },

  // Spacing Utilities
  marginXs: { margin: spacing.xs },
  marginSm: { margin: spacing.sm },
  marginMd: { margin: spacing.md },
  marginLg: { margin: spacing.lg },
  marginXl: { margin: spacing.xl },
  marginTopXs: { marginTop: spacing.xs },
  marginTopSm: { marginTop: spacing.sm },
  marginTopMd: { marginTop: spacing.md },
  marginTopLg: { marginTop: spacing.lg },
  marginTopXl: { marginTop: spacing.xl },
  marginBottomXs: { marginBottom: spacing.xs },
  marginBottomSm: { marginBottom: spacing.sm },
  marginBottomMd: { marginBottom: spacing.md },
  marginBottomLg: { marginBottom: spacing.lg },
  marginBottomXl: { marginBottom: spacing.xl },
  marginHorizontalXs: { marginHorizontal: spacing.xs },
  marginHorizontalSm: { marginHorizontal: spacing.sm },
  marginHorizontalMd: { marginHorizontal: spacing.md },
  marginHorizontalLg: { marginHorizontal: spacing.lg },
  marginHorizontalXl: { marginHorizontal: spacing.xl },
  marginVerticalXs: { marginVertical: spacing.xs },
  marginVerticalSm: { marginVertical: spacing.sm },
  marginVerticalMd: { marginVertical: spacing.md },
  marginVerticalLg: { marginVertical: spacing.lg },
  marginVerticalXl: { marginVertical: spacing.xl },
  paddingXs: { padding: spacing.xs },
  paddingSm: { padding: spacing.sm },
  paddingMd: { padding: spacing.md },
  paddingLg: { padding: spacing.lg },
  paddingXl: { padding: spacing.xl },
  paddingTopXs: { paddingTop: spacing.xs },
  paddingTopSm: { paddingTop: spacing.sm },
  paddingTopMd: { paddingTop: spacing.md },
  paddingTopLg: { paddingTop: spacing.lg },
  paddingTopXl: { paddingTop: spacing.xl },
  paddingBottomXs: { paddingBottom: spacing.xs },
  paddingBottomSm: { paddingBottom: spacing.sm },
  paddingBottomMd: { paddingBottom: spacing.md },
  paddingBottomLg: { paddingBottom: spacing.lg },
  paddingBottomXl: { paddingBottom: spacing.xl },
  paddingHorizontalXs: { paddingHorizontal: spacing.xs },
  paddingHorizontalSm: { paddingHorizontal: spacing.sm },
  paddingHorizontalMd: { paddingHorizontal: spacing.md },
  paddingHorizontalLg: { paddingHorizontal: spacing.lg },
  paddingHorizontalXl: { paddingHorizontal: spacing.xl },
  paddingVerticalXs: { paddingVertical: spacing.xs },
  paddingVerticalSm: { paddingVertical: spacing.sm },
  paddingVerticalMd: { paddingVertical: spacing.md },
  paddingVerticalLg: { paddingVertical: spacing.lg },
  paddingVerticalXl: { paddingVertical: spacing.xl },

  // Gap Utilities
  gapXs: { gap: spacing.xs },
  gapSm: { gap: spacing.sm },
  gapMd: { gap: spacing.md },
  gapLg: { gap: spacing.lg },
  gapXl: { gap: spacing.xl },

  // Width/Height Utilities
  widthFull: { width: '100%' },
  heightFull: { height: '100%' },
  widthHalf: { width: '50%' },
  heightHalf: { height: '50%' },

  // Border Radius Utilities
  roundedXs: { borderRadius: 4 },
  roundedSm: { borderRadius: 6 },
  roundedMd: { borderRadius: 8 },
  roundedLg: { borderRadius: 12 },
  roundedXl: { borderRadius: 16 },
  roundedFull: { borderRadius: 9999 },

  // Position Utilities
  absolute: { position: 'absolute' },
  relative: { position: 'relative' },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  absoluteTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  absoluteBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});

// ============================================================================
// TEXT STYLES
// ============================================================================

export const textStyles = StyleSheet.create({
  // Heading Styles
  h1: {
    ...typography.h1,
    color: colors.white,
  },
  h2: {
    ...typography.h2,
    color: colors.white,
  },
  h3: {
    ...typography.h3,
    color: colors.white,
  },
  h1Light: {
    ...typography.h1,
    color: colors.overlayText,
  },
  h2Light: {
    ...typography.h2,
    color: colors.overlayText,
  },
  h3Light: {
    ...typography.h3,
    color: colors.overlayText,
  },

  // Body Text Styles
  body: {
    ...typography.body,
    color: colors.text,
  },
  bodySecondary: {
    ...typography.body,
    color: colors.textSecondary,
  },
  bodyLight: {
    ...typography.body,
    color: colors.overlayText,
  },
  small: {
    ...typography.small,
    color: colors.text,
  },
  smallSecondary: {
    ...typography.small,
    color: colors.textSecondary,
  },
  smallLight: {
    ...typography.small,
    color: colors.overlayText,
  },

  // Text Alignment
  textLeft: { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  textJustify: { textAlign: 'justify' },

  // Text Weight
  textBold: { fontWeight: 'bold' },
  textSemiBold: { fontWeight: '600' },
  textNormal: { fontWeight: '400' },
  textLight: { fontWeight: '300' },

  // Text Transform
  textUppercase: { textTransform: 'uppercase' },
  textLowercase: { textTransform: 'lowercase' },
  textCapitalize: { textTransform: 'capitalize' },
});

// ============================================================================
// PLATFORM-SPECIFIC STYLES
// ============================================================================

export const platformStyles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  shadowLarge: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

// ============================================================================
// EXPORT ALL STYLES
// ============================================================================

export default {
  commonStyles,
  screenStyles,
  layoutStyles,
  textStyles,
  platformStyles,
  colors,
  spacing,
  typography,
};

