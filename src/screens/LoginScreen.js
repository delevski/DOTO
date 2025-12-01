import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db } from '../lib/instant';
import { verifyPassword, generateVerificationCode } from '../utils/password';
import { useAuth } from '../context/AuthContext';
import { t } from '../utils/translations';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [pendingUser, setPendingUser] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const verificationRefs = useRef([]);

  // Query all users for email lookup
  const { data: usersData } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('pleaseEnterEmail'));
      return;
    }
    if (!password) {
      Alert.alert(t('error'), t('pleaseEnterPassword'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('error'), t('pleaseEnterValidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userRecord = allUsers.find(u => 
        (u.emailLower && u.emailLower === normalizedEmail) || 
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );

      if (!userRecord) {
        Alert.alert(t('error'), t('accountNotFound'));
        setIsLoading(false);
        return;
      }

      if (!userRecord.passwordHash) {
        Alert.alert(t('error'), 'This account uses social login. Please sign in with Google or Facebook.');
        setIsLoading(false);
        return;
      }

      const isValidPassword = await verifyPassword(password, userRecord.passwordHash);
      
      if (!isValidPassword) {
        Alert.alert(t('error'), t('incorrectPassword'));
        setIsLoading(false);
        return;
      }

      // Generate verification code
      const code = generateVerificationCode();
      setGeneratedCode(code);
      setPendingUser(userRecord);
      setShowVerification(true);
      
      // In a real app, send email with code
      // For demo, show in alert
      Alert.alert(
        'Verification Code',
        `Your verification code is: ${code}\n\n(In production, this would be sent to your email)`,
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert(t('error'), t('failedToLogin'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      verificationRefs.current[index + 1]?.focus();
    }
  };

  const handleVerificationKeyPress = (index, key) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      verificationRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const enteredCode = verificationCode.join('');
    
    if (enteredCode !== generatedCode) {
      Alert.alert(t('error'), 'Invalid verification code');
      return;
    }

    // Login successful
    const success = await login(pendingUser);
    if (success) {
      navigation.replace('MainTabs');
    } else {
      Alert.alert(t('error'), 'Failed to complete login');
    }
  };

  if (showVerification) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowVerification(false)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('enterVerificationCode')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('verificationCodeSent')} {pendingUser?.email}
          </Text>
        </LinearGradient>

        <View style={styles.verificationContent}>
          <View style={styles.codeInputContainer}>
            {verificationCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => (verificationRefs.current[index] = el)}
                style={styles.codeInput}
                value={digit}
                onChangeText={(value) => handleVerificationCodeChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleVerificationKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Demo code display */}
          <View style={styles.demoCodeBox}>
            <Text style={styles.demoCodeLabel}>📧 Demo Mode - Your Code:</Text>
            <Text style={styles.demoCodeText}>{generatedCode}</Text>
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, verificationCode.join('').length !== 6 && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={verificationCode.join('').length !== 6}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>{t('verifyCode')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.logo}>DOTO</Text>
        <Text style={styles.tagline}>Do One Thing Others</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{t('welcomeBack')}</Text>
            <Text style={styles.subtitle}>{t('signInToContinue')}</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('emailAddress')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('password')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={styles.loginButtonWrapper}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{t('logIn')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>{t('google')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
                <Text style={styles.socialButtonText}>{t('facebook')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('dontHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{t('signUp')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    padding: spacing.sm,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  headerSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  formContainer: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.smallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  inputIcon: {
    marginLeft: spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.sm,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButtonWrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.button,
  },
  gradientButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.small,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
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
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialButtonText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  verificationContent: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  demoCodeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  demoCodeLabel: {
    ...typography.small,
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  demoCodeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 4,
  },
  verifyButton: {
    width: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.button,
  },
});
