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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db, id } from '../lib/instant';
import { hashPassword, generateVerificationCode } from '../utils/password';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

export default function RegisterScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const darkMode = useSettingsStore((state) => state.darkMode);

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
  const [generatedCode, setGeneratedCode] = useState('');

  const inputRefs = useRef([]);

  // Query all users to check for existing email
  const { data: usersData } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

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
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a photo.');
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
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRegister = async () => {
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
        setError('An account with this email already exists. Please login instead.');
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

      // Generate verification code
      const code = generateVerificationCode();
      setGeneratedCode(code);
      setPendingUser(userData);
      setShowVerification(true);
      
      Alert.alert(
        'Verification Code',
        `Your code is: ${code}\n\n(In production, this would be sent to your email)`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to register. Please try again.');
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

    setIsLoading(true);

    try {
      // Save user to InstantDB
      await db.transact(db.tx.users[pendingUser.id].update(pendingUser));
      
      // Login the user
      await login(pendingUser);
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to create account. Please try again.');
      setIsLoading(false);
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
            Join our community
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: themeColors.surface }]}>
          {!showVerification ? (
            <>
              <Text style={[styles.title, { color: themeColors.text }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                Start helping others in your community
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
                      <Text style={styles.avatarIcon}>📷</Text>
                      <Text style={[styles.avatarText, { color: themeColors.textSecondary }]}>
                        Add Photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  Full Name
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="John Doe"
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
                    placeholder="At least 6 characters"
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

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  Confirm Password
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="Repeat your password"
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
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
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
                Verify Your Email
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
                  (verificationCode.join('').length !== 6 || isLoading) && styles.buttonDisabled
                ]}
                onPress={handleVerifyCode}
                disabled={verificationCode.join('').length !== 6 || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Login Link */}
        {!showVerification && (
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: themeColors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
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
  avatarIcon: {
    fontSize: 24,
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
