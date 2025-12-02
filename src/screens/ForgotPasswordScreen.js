import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { db } from '../lib/instant';
import { generateVerificationCode } from '../utils/password';
import { t } from '../utils/translations';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Query all users
  const { data: usersData } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('pleaseEnterEmail'));
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

      const code = generateVerificationCode();
      setGeneratedCode(code);
      setCodeSent(true);

      // In production, send email with code
      Alert.alert(
        'Reset Code Sent',
        `Your password reset code is: ${code}\n\n(In production, this would be sent to your email)`,
        [{ text: 'OK' }]
      );

    } catch (err) {
      console.error('Error:', err);
      Alert.alert(t('error'), 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('forgotPassword')}</Text>
        <Text style={styles.headerSubtitle}>
          Enter your email and we'll send you a reset code
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('emailAddress')}</Text>
            <View style={styles.inputWrapper}>
              <Icon name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
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

          {codeSent && (
            <View style={styles.demoCodeBox}>
              <Text style={styles.demoCodeLabel}>📧 Demo Mode - Your Reset Code:</Text>
              <Text style={styles.demoCodeText}>{generatedCode}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSendCode}
            disabled={isLoading}
            style={styles.buttonWrapper}
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
                <Text style={styles.buttonText}>
                  {codeSent ? 'Resend Code' : 'Send Reset Code'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backToLogin}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
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
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
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
  demoCodeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  buttonWrapper: {
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
  backToLogin: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  backToLoginText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
});
