import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Calculate responsive code input size: screen width - padding (40px each side) - card padding (40px) - gaps (5*6px)
const CODE_CELL_SIZE = Math.min(48, (SCREEN_WIDTH - 80 - 40 - 30) / 6);
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db, id } from '../lib/instant';
import { hashPassword } from '../utils/password';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import Icon from '../components/Icon';

export default function RegisterScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  const { alert } = useDialog();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [pendingUser, setPendingUser] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef([]);
  const cooldownTimerRef = useRef(null);

  // Query all users to check for existing email
  const { data: usersData } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  // Start cooldown timer
  const startCooldown = useCallback((seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const themeColors = {
    background: darkMode ? colors.backgroundDark : colors.background,
    surface: darkMode ? colors.surfaceDark : colors.surface,
    text: darkMode ? colors.textDark : colors.text,
    textSecondary: darkMode ? colors.textSecondaryDark : colors.textSecondary,
    border: darkMode ? colors.borderDark : colors.border,
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert(t('errors.permissionNeeded'), t('errors.galleryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Store as base64 data URL for persistence
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setAvatar(base64Image);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      alert(t('common.error'), t('errors.failedToPickImage'));
    }
  };

  const handleRegister = async () => {
    setError('');

    // Validation
    if (!name.trim()) {
      setError(t('validation.enterName'));
      return;
    }

    if (!email.trim()) {
      setError(t('validation.enterEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('validation.invalidEmail'));
      return;
    }

    if (!password) {
      setError(t('validation.enterPassword'));
      return;
    }

    if (password.length < 6) {
      setError(t('validation.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('validation.passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check if email already exists
      const existingUser = allUsers.find(u => 
        (u.emailLower && u.emailLower === normalizedEmail) || 
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );

      if (existingUser) {
        setError(t('auth.emailExists'));
        setIsLoading(false);
        return;
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user object
      const userId = id();
      const userData = {
        id: userId,
        name: name.trim(),
        email: email.trim(),
        emailLower: normalizedEmail,
        avatar: avatar || `https://i.pravatar.cc/150?u=${userId}`,
        passwordHash,
        rating: 0,
        bio: '',
        createdAt: Date.now(),
        authProvider: 'email',
      };

      // Send magic code via InstantDB
      setPendingUser(userData);
      setShowVerification(true);
      
      try {
        await db.auth.sendMagicCode({ email: normalizedEmail });
        startCooldown(60); // Start 60 second cooldown
        alert(
          t('auth.checkYourEmail'),
          t('auth.magicCodeSent')
        );
      } catch (err) {
        console.error('Error sending magic code:', err);
        // Extract user-friendly error message from InstantDB response
        let errorMessage = t('errors.tryAgain');
        if (err.body?.message) {
          errorMessage = err.body.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setShowVerification(false);
        setPendingUser(null);
      }
    } catch (err) {
      console.error('Registration error:', err);
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
    
    if (enteredCode.length !== 6) {
      setError(t('auth.enterFullCode') || 'Please enter the full 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Verify magic code via InstantDB
      await db.auth.signInWithMagicCode({ 
        email: pendingUser?.email?.toLowerCase() || email.trim().toLowerCase(), 
        code: enteredCode 
      });
      
      // If successful, save user to InstantDB and login
      await db.transact(db.tx.users[pendingUser.id].update(pendingUser));
      await login(pendingUser);
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(t('auth.invalidCode'));
      setVerificationCode(['', '', '', '', '', '']);
      setIsLoading(false);
    }
  };

  const resetVerification = () => {
    setShowVerification(false);
    setVerificationCode(['', '', '', '', '', '']);
    setPendingUser(null);
    setError('');
    setResendCooldown(0);
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending || !pendingUser) return;
    
    setIsResending(true);
    setError('');
    
    try {
      const normalizedEmail = pendingUser.email?.toLowerCase() || email.trim().toLowerCase();
      await db.auth.sendMagicCode({ email: normalizedEmail });
      startCooldown(60);
      alert(
        t('auth.codeSent'),
        t('auth.newCodeSent')
      );
    } catch (err) {
      console.error('Error resending code:', err);
      setError(err.body?.message || t('errors.tryAgain'));
    } finally {
      setIsResending(false);
    }
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
            {t('auth.createAccountSubtitle')}
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          {!showVerification ? (
            <>
              <Text style={[styles.title, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                {t('auth.createAccount')}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary, textAlign: rtlStyles.textAlign }]}>
                {t('auth.createAccountSubtitle')}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Avatar Upload */}
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={pickImage} style={styles.avatarButton}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { borderColor: themeColors.border }]}>
                      <Icon name="camera" size={28} color={colors.primary} />
                      <Text style={[styles.avatarText, { color: themeColors.textSecondary }]}>
                        {t('auth.addPhoto')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                  {t('auth.fullName')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                  <View style={styles.inputIconWrapper}>
                    <Icon name="person" size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                    placeholder={t('auth.namePlaceholder')}
                    placeholderTextColor={themeColors.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                  {t('auth.email')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                  <View style={styles.inputIconWrapper}>
                    <Icon name="mail" size={20} color={colors.primary} />
                  </View>
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
                  <View style={styles.inputIconWrapper}>
                    <Icon name="lock-closed" size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                    placeholder={t('auth.passwordMinLength')}
                    placeholderTextColor={themeColors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}>
                  {t('auth.confirmPassword')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border, flexDirection: rtlStyles.row }]}>
                  <View style={styles.inputIconWrapper}>
                    <Icon name="lock-closed" size={20} color={colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: themeColors.text, textAlign: rtlStyles.textAlign }]}
                    placeholder={t('auth.repeatPassword')}
                    placeholderTextColor={themeColors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.createAccount')}</Text>
                )}
              </TouchableOpacity>
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
                  <Text style={styles.errorText}>{error}</Text>
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


              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  (verificationCode.join('').length !== 6 || isLoading) && styles.buttonDisabled
                ]}
                onPress={handleVerifyCode}
                disabled={verificationCode.join('').length !== 6 || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.verifyAndCreate')}</Text>
                )}
              </TouchableOpacity>

              {/* Resend Code Section */}
              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, { color: themeColors.textSecondary }]}>
                  {t('auth.didntReceiveCode') || "Didn't receive the code?"}
                </Text>
                {resendCooldown > 0 ? (
                  <Text style={[styles.cooldownText, { color: themeColors.textSecondary }]}>
                    {t('auth.resendIn') || 'Resend in'} {resendCooldown}s
                  </Text>
                ) : (
                  <TouchableOpacity 
                    onPress={handleResendCode}
                    disabled={isResending}
                    activeOpacity={0.7}
                  >
                    {isResending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.resendLink}>
                        {t('auth.resendCode') || 'Resend Code'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* Login Link */}
        {!showVerification && (
          <View style={[styles.loginContainer, { flexDirection: rtlStyles.row }]}>
            <Text style={[styles.loginText, { color: themeColors.textSecondary }]}>
              {t('auth.alreadyHaveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t('auth.login')}</Text>
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
    paddingTop: 50,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 48,
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: spacing.lg,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  avatarIconWrapper: {
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.md,
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
  inputIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
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
    gap: Math.min(spacing.sm, 6),
    marginVertical: spacing.xl,
    flexWrap: 'nowrap',
    paddingHorizontal: spacing.xs,
  },
  codeInput: {
    width: CODE_CELL_SIZE,
    height: CODE_CELL_SIZE * 1.15,
    borderWidth: 2,
    borderRadius: 10,
    fontSize: Math.min(24, CODE_CELL_SIZE * 0.5),
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
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  resendText: {
    fontSize: 14,
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
