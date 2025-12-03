import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { db, id } from '../lib/instant';
import { verifyPassword, generateVerificationCode } from '../utils/password';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

export default function LoginScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [pendingUser, setPendingUser] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');

  const inputRefs = useRef([]);

  // Query all users from InstantDB
  const { data: usersData, isLoading: isQueryLoading } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError(t('validation.enterEmail'));
      return;
    }

    if (!password) {
      setError(t('validation.enterPassword'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('validation.invalidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Find user in InstantDB
      const userRecord = allUsers.find(u => 
        (u.emailLower && u.emailLower === normalizedEmail) || 
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );

      if (!userRecord) {
        setError(t('auth.accountNotFound'));
        setIsLoading(false);
        return;
      }

      // Check if user has a password (not social login only)
      if (!userRecord.passwordHash) {
        setError(t('auth.socialLoginOnly'));
        setIsLoading(false);
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, userRecord.passwordHash);
      
      if (!isValidPassword) {
        setError(t('auth.incorrectPassword'));
        setIsLoading(false);
        return;
      }

      // Generate verification code
      const code = generateVerificationCode();
      setGeneratedCode(code);
      setPendingUser(userRecord);
      setShowVerification(true);
      
      // In production, this would be sent via email
      Alert.alert(
        t('auth.verificationCode'),
        `${t('auth.devModeCode')} ${code}`,
        [{ text: t('common.ok') }]
      );
    } catch (err) {
      console.error('Login error:', err);
      setError(t('errors.tryAgain'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    
    try {
      // Check if demo user exists in database
      const demoEmail = 'demo@doto.app';
      let demoUser = allUsers.find(u => 
        u.email?.toLowerCase() === demoEmail || u.emailLower === demoEmail
      );

      if (!demoUser) {
        // Create demo user if not exists
        const demoUserId = id();
        demoUser = {
          id: demoUserId,
          name: 'Demo User',
          email: demoEmail,
          emailLower: demoEmail,
          avatar: 'https://i.pravatar.cc/150?u=demo',
          rating: 4.8,
          bio: 'This is a demo account for testing DOTO',
          createdAt: Date.now(),
          authProvider: 'demo',
        };

        await db.transact(db.tx.users[demoUserId].update(demoUser));
      }
      
      await login(demoUser);
    } catch (err) {
      console.error('Demo login error:', err);
      setError(t('errors.tryAgain'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Move to next input (RTL-aware)
    const nextIndex = isRTL ? index - 1 : index + 1;
    if (value && nextIndex >= 0 && nextIndex < 6) {
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleCodeKeyDown = (index, key) => {
    if (key === 'Backspace' && !verificationCode[index]) {
      const prevIndex = isRTL ? index + 1 : index - 1;
      if (prevIndex >= 0 && prevIndex < 6) {
        inputRefs.current[prevIndex]?.focus();
      }
    }
  };

  const handleVerifyCode = async () => {
    const enteredCode = verificationCode.join('');
    
    if (enteredCode !== generatedCode) {
      setError(t('auth.invalidCode'));
      return;
    }

    if (pendingUser) {
      await login(pendingUser);
    }
  };

  const resetVerification = () => {
    setShowVerification(false);
    setVerificationCode(['', '', '', '', '', '']);
    setPendingUser(null);
    setGeneratedCode('');
    setError('');
  };

  if (isQueryLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>DOTO</Text>
          <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>
            {isRTL ? 'עשה דבר אחד לאחרים' : 'Do One Thing Others'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          {!showVerification ? (
            <>
              <Text style={[styles.title, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                {t('auth.welcomeBack')}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary, textAlign: rtlStyles.textAlign }]}>
                {t('auth.signInSubtitle')}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={[styles.errorText, { textAlign: rtlStyles.textAlign }]}>{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                  {t('auth.email')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                  <Text style={styles.inputIcon}>📧</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={themeColors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                  {t('auth.password')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor={themeColors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.inputIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={[styles.divider, { flexDirection: rtlStyles.row }]}>
                <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
                <Text style={[styles.dividerText, { color: themeColors.textSecondary }]}>
                  {t('auth.orContinueWith')}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
              </View>

              {/* Demo Login Button */}
              <TouchableOpacity
                style={[styles.demoButton, { borderColor: colors.primary, flexDirection: rtlStyles.row }]}
                onPress={handleDemoLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.demoIcon}>⚡</Text>
                <Text style={[styles.demoButtonText, { color: colors.primary }]}>
                  {t('auth.tryDemoAccount')}
                </Text>
              </TouchableOpacity>

              {/* Social Buttons */}
              <View style={[styles.socialButtons, { flexDirection: rtlStyles.row }]}>
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.socialIcon, { color: '#DB4437' }]}>G</Text>
                  <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                    {t('auth.google')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.socialIcon, { color: '#4267B2' }]}>f</Text>
                  <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                    {t('auth.facebook')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Verification Screen */}
              <TouchableOpacity 
                style={[styles.backButton, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
                onPress={resetVerification}
              >
                <Text style={[styles.backText, { color: themeColors.text }]}>
                  {isRTL ? '→ ' : '← '}{t('common.back')}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                {t('auth.enterVerificationCode')}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary, textAlign: rtlStyles.textAlign }]}>
                {t('auth.codeSentTo', { email: pendingUser?.email })}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={[styles.errorText, { textAlign: rtlStyles.textAlign }]}>{error}</Text>
                </View>
              ) : null}

              {/* Code Input */}
              <View style={[styles.codeContainer, { flexDirection: rtlStyles.row }]}>
                {verificationCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    style={[
                      styles.codeInput,
                      { 
                        borderColor: digit ? colors.primary : themeColors.border,
                        color: themeColors.text,
                      }
                    ]}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(index, value)}
                    onKeyPress={({ nativeEvent }) => handleCodeKeyDown(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Show code hint for development */}
              <View style={styles.codeHint}>
                <Text style={[styles.codeHintLabel, { color: themeColors.textSecondary }]}>
                  {t('auth.devModeCode')}
                </Text>
                <Text style={styles.codeHintValue}>{generatedCode}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  verificationCode.join('').length !== 6 && styles.buttonDisabled
                ]}
                onPress={handleVerifyCode}
                disabled={verificationCode.join('').length !== 6}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>{t('auth.verifyCode')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sign Up Link */}
        {!showVerification && (
          <View style={[styles.signupContainer, { flexDirection: rtlStyles.row }]}>
            <Text style={[styles.signupText, { color: themeColors.textSecondary }]}>
              {t('auth.dontHaveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: 60,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.md,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.primary,
  },
  tagline: {
    fontSize: 16,
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: spacing.xl,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  inputIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  demoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  demoIcon: {
    fontSize: 18,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtons: {
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    gap: spacing.sm,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  signupContainer: {
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  codeContainer: {
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  codeHint: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  codeHintLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  codeHintValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D4ED8',
    letterSpacing: 4,
  },
});
