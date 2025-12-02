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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db, id } from '../lib/instant';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

export default function RegisterScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const t = useTranslation();

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

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload an avatar.');
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
      setAvatar(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!email.trim()) {
      setError(t('pleaseEnterEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('pleaseEnterValidEmail'));
      return;
    }

    if (!password) {
      setError(t('pleaseEnterPassword'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
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
        setError(t('emailAlreadyExists'));
        setIsLoading(false);
        return;
      }

      // Create new user
      const userId = id();
      const newUser = {
        id: userId,
        name: name.trim(),
        email: email.trim(),
        emailLower: normalizedEmail,
        avatar: avatar || `https://i.pravatar.cc/150?u=${userId}`,
        rating: 0,
        bio: '',
        createdAt: Date.now(),
        authProvider: 'email',
        passwordHash: password, // In production, hash this!
      };

      // Save to InstantDB
      await db.transact(
        db.tx.users[userId].update(newUser)
      );

      // Generate verification code
      const code = generateVerificationCode();
      setGeneratedCode(code);
      setPendingUser(newUser);
      setShowVerification(true);
      
      Alert.alert(
        'Verification Code',
        `Your code is: ${code}\n\n(In production, this would be sent via email)`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('failedToRegister'));
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
      const { passwordHash, ...safeUser } = pendingUser;
      await login(safeUser);
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
                {t('createAccount')}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                {t('joinCommunity')}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Avatar Picker */}
              <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={colors.primary} />
                    <Text style={styles.avatarText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  {t('fullName')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Ionicons name="person-outline" size={20} color={themeColors.textSecondary} />
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

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  {t('confirmPassword')}
                </Text>
                <View style={[styles.inputWrapper, { borderColor: themeColors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="••••••••"
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
                  <Text style={styles.primaryButtonText}>{t('register')}</Text>
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

        {/* Login Link */}
        {!showVerification && (
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: themeColors.textSecondary }]}>
              {t('alreadyHaveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t('logIn')}</Text>
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
    paddingTop: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
  tagline: {
    fontSize: typography.base,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.base,
    marginBottom: spacing.lg,
    textAlign: 'center',
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
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.errorLight,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: typography.xs,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.md,
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
    marginTop: spacing.lg,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  loginText: {
    fontSize: typography.base,
  },
  loginLink: {
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
