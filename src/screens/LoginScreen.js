import React, { useState, useRef, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

export default function LoginScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const isRTL = language === 'he';

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

  // Query all users
  const { data: usersData } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError(t('pleaseEnterEmail'));
      return;
    }

    if (!password) {
      setError(t('pleaseEnterPassword'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('pleaseEnterValidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Find user
      const userRecord = allUsers.find(u => 
        (u.emailLower && u.emailLower === normalizedEmail) || 
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );

      if (!userRecord) {
        setError(t('accountNotFound'));
        setIsLoading(false);
        return;
      }

      // For demo purposes, accept any password or check if it matches
      // In production, you'd verify the password hash
      if (userRecord.passwordHash && password !== 'demo123') {
        // Simple check - in production use proper password verification
        setError(t('incorrectPassword'));
        setIsLoading(false);
        return;
      }

      // Generate verification code
      const code = generateVerificationCode();
      setGeneratedCode(code);
      setPendingUser(userRecord);
      setShowVerification(true);
      
      // Show the code in an alert for development
      Alert.alert(
        'Verification Code',
        `Your code is: ${code}\n\n(In production, this would be sent via email)`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Login error:', err);
      setError(t('failedToLogin'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    
    try {
      // Create or find demo user
      const demoUser = {
        id: 'demo-user-id',
        name: 'Demo User',
        email: 'demo@doto.app',
        avatar: 'https://i.pravatar.cc/150?u=demo',
        rating: 4.8,
        bio: 'This is a demo account',
        createdAt: Date.now(),
      };
      
      await login(demoUser);
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Failed to login with demo account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, key) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const enteredCode = verificationCode.join('');
    
    if (enteredCode !== generatedCode) {
      setError(t('invalidVerificationCode'));
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
            Do One Thing Others
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          {!showVerification ? (
            <>
              <Text style={[styles.title, { color: themeColors.text }]}>
                {t('welcomeBack')}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                {t('signInToContinue')}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  {t('emailAddress')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="your.email@example.com"
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
                <Text style={[styles.label, { color: themeColors.text }]}>
                  {t('password')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={themeColors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color={themeColors.textSecondary} 
                    />
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
                  <Text style={styles.primaryButtonText}>{t('logIn')}</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
                <Text style={[styles.dividerText, { color: themeColors.textSecondary }]}>
                  {t('orContinueWith')}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
              </View>

              {/* Demo Login Button */}
              <TouchableOpacity
                style={[styles.demoButton, { borderColor: themeColors.border }]}
                onPress={handleDemoLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-outline" size={20} color={colors.primary} />
                <Text style={[styles.demoButtonText, { color: colors.primary }]}>
                  Try Demo Account
                </Text>
              </TouchableOpacity>

              {/* Social Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: themeColors.border }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                    {t('google')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: themeColors.border }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-facebook" size={20} color="#4267B2" />
                  <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                    {t('facebook')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Verification Screen */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={resetVerification}
              >
                <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                <Text style={[styles.backText, { color: themeColors.text }]}>
                  {t('back')}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: themeColors.text }]}>
                {t('enterVerificationCode')}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                {t('verificationCodeSent')} {pendingUser?.email}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Code Input */}
              <View style={styles.codeContainer}>
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
                <Text style={[styles.codeHintText, { color: themeColors.textSecondary }]}>
                  Your code: {generatedCode}
                </Text>
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
                <Text style={styles.primaryButtonText}>{t('verifyCode')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sign Up Link */}
        {!showVerification && (
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: themeColors.textSecondary }]}>
              {t('dontHaveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>{t('signUp')}</Text>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.primary,
  },
  tagline: {
    fontSize: typography.md,
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    marginBottom: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.md,
    paddingVertical: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
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
    fontSize: typography.md,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: spacing.lg,
    fontSize: typography.sm,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  demoButtonText: {
    fontSize: typography.base,
    fontWeight: '600',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  socialButtonText: {
    fontSize: typography.base,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  signupText: {
    fontSize: typography.base,
  },
  signupLink: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  backText: {
    fontSize: typography.md,
    fontWeight: '500',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    fontSize: typography.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  codeHint: {
    backgroundColor: '#DBEAFE',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  codeHintText: {
    textAlign: 'center',
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.info,
  },
});
