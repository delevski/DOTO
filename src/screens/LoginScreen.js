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
import { db, id } from '../lib/instant';
import { verifyPassword, generateVerificationCode } from '../utils/password';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

export default function LoginScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const darkMode = useSettingsStore((state) => state.darkMode);

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
      setError('Please enter your email');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
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
        setError('Account not found. Please register first.');
        setIsLoading(false);
        return;
      }

      // Check if user has a password (not social login only)
      if (!userRecord.passwordHash) {
        setError('This account uses social login. Please use Google or Facebook.');
        setIsLoading(false);
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, userRecord.passwordHash);
      
      if (!isValidPassword) {
        setError('Incorrect password. Please try again.');
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
        'Verification Code',
        `Your code is: ${code}\n\n(In production, this would be sent to your email)`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please try again.');
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
      setError('Invalid verification code. Please try again.');
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
          Connecting to database...
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
            Do One Thing Others
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          {!showVerification ? (
            <>
              <Text style={[styles.title, { color: themeColors.text }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                Sign in to continue helping your community
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  Email Address
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Text style={styles.inputIcon}>📧</Text>
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
                  Password
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Text style={styles.inputIcon}>🔒</Text>
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
                  <Text style={styles.primaryButtonText}>Log In</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
                <Text style={[styles.dividerText, { color: themeColors.textSecondary }]}>
                  or continue with
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
              </View>

              {/* Demo Login Button */}
              <TouchableOpacity
                style={[styles.demoButton, { borderColor: colors.primary }]}
                onPress={handleDemoLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.demoIcon}>⚡</Text>
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
                  <Text style={[styles.socialIcon, { color: '#DB4437' }]}>G</Text>
                  <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                    Google
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: themeColors.border }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.socialIcon, { color: '#4267B2' }]}>f</Text>
                  <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                    Facebook
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
                <Text style={[styles.backText, { color: themeColors.text }]}>
                  ← Back
                </Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: themeColors.text }]}>
                Enter Verification Code
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                We sent a code to {pendingUser?.email}
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
                <Text style={[styles.codeHintLabel, { color: themeColors.textSecondary }]}>
                  Development Mode - Your code:
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
                <Text style={styles.primaryButtonText}>Verify Code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sign Up Link */}
        {!showVerification && (
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: themeColors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
