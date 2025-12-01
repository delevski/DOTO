import React, { useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db, id } from '../lib/instant';
import { hashPassword, generateVerificationCode } from '../utils/password';
import { useAuth } from '../context/AuthContext';
import { t } from '../utils/translations';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    location: '',
  });
  const [avatar, setAvatar] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [pendingUser, setPendingUser] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const verificationRefs = useRef([]);

  // Query all users for email check
  const { data: usersData } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      // Store as base64 data URL
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64Image);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert(t('error'), 'Please enter your name');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert(t('error'), t('pleaseEnterEmail'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert(t('error'), t('pleaseEnterValidEmail'));
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      Alert.alert(t('error'), 'Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t('error'), 'Passwords do not match');
      return;
    }
    if (!formData.age || parseInt(formData.age) < 13 || parseInt(formData.age) > 120) {
      Alert.alert(t('error'), 'Please enter a valid age (13-120)');
      return;
    }
    if (!formData.location.trim()) {
      Alert.alert(t('error'), 'Please enter your location');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      
      // Check if email already exists
      const existingUser = allUsers.find(u => 
        (u.emailLower && u.emailLower === normalizedEmail) || 
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );

      if (existingUser) {
        Alert.alert(t('error'), 'This email is already registered. Please log in instead.');
        setIsLoading(false);
        return;
      }

      // Hash password
      const passwordHash = await hashPassword(formData.password);

      // Create user object
      const userId = id();
      const avatarUrl = avatar || `https://i.pravatar.cc/150?u=${formData.name}`;
      
      const userData = {
        id: userId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        emailLower: normalizedEmail,
        age: parseInt(formData.age),
        location: formData.location.trim(),
        avatar: avatarUrl,
        rating: 0,
        bio: '',
        createdAt: Date.now(),
        authProvider: 'email',
        passwordHash,
      };

      // Save user to InstantDB
      await db.transact(
        db.tx.users[userId].update(userData)
      );

      // Generate verification code
      const code = generateVerificationCode();
      setGeneratedCode(code);
      setPendingUser(userData);
      setShowVerification(true);
      
      Alert.alert(
        'Verification Code',
        `Your verification code is: ${code}\n\n(In production, this would be sent to your email)`,
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert(t('error'), 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

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

    const success = await login(pendingUser);
    if (success) {
      navigation.replace('MainTabs');
    } else {
      Alert.alert(t('error'), 'Failed to complete registration');
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
        style={styles.headerGradientSmall}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createAccount')}</Text>
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
            {/* Profile Image Picker */}
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={32} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="add" size={16} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to add profile photo</Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('fullName')} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={colors.textMuted}
                  value={formData.name}
                  onChangeText={(v) => updateFormData('name', v)}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('emailAddress')} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={formData.email}
                  onChangeText={(v) => updateFormData('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('password')} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={colors.textMuted}
                  value={formData.password}
                  onChangeText={(v) => updateFormData('password', v)}
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

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('confirmPassword')} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textMuted}
                  value={formData.confirmPassword}
                  onChangeText={(v) => updateFormData('confirmPassword', v)}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Age Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('age')} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="25"
                  placeholderTextColor={colors.textMuted}
                  value={formData.age}
                  onChangeText={(v) => updateFormData('age', v)}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Location Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('location')} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tel Aviv, Israel"
                  placeholderTextColor={colors.textMuted}
                  value={formData.location}
                  onChangeText={(v) => updateFormData('location', v)}
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              style={styles.registerButtonWrapper}
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
                  <Text style={styles.buttonText}>{t('completeRegistration')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t('alreadyHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t('logIn')}</Text>
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
  headerGradientSmall: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    padding: spacing.sm,
    zIndex: 10,
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
    marginTop: -spacing.md,
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
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  avatar: {
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
    backgroundColor: colors.inputBg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
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
  registerButtonWrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
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
