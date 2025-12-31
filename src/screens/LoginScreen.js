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
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRTL, useRTLStyles } from '../context/RTLContext';
import { useDialog } from '../context/DialogContext';
import { db } from '../lib/instant';
import { verifyPassword } from '../utils/password';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import Icon from '../components/Icon';
import {
  useGoogleAuth,
  useFacebookAuth,
  fetchGoogleUserProfile,
  fetchGoogleContacts,
  fetchFacebookUserProfile,
  fetchFacebookFriends,
  findOrCreateSocialUser,
  isGoogleConfigured,
  isFacebookConfigured,
  isRunningInExpoGo,
  getFacebookAuthDebugInfo,
  exchangeGoogleCode,
} from '../lib/socialAuth';

export default function LoginScreen({ navigation }) {
  const login = useAuthStore((state) => state.login);
  const darkMode = useSettingsStore((state) => state.darkMode);
  const { t, isRTL } = useRTL();
  const rtlStyles = useRTLStyles();
  const { alert } = useDialog();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // Social login state
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [socialLoadingType, setSocialLoadingType] = useState(null); // 'google' | 'facebook'

  // Social auth hooks
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync } = useGoogleAuth();
  const { promptAsync: facebookPromptAsync } = useFacebookAuth();

  // Query all users from InstantDB
  const { data: usersData, isLoading: isQueryLoading } = db.useQuery({ users: {} });
  const allUsers = usersData?.users || [];

  // Handle Google OAuth response
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (googleResponse?.type === 'success') {
        const { code } = googleResponse.params;

        if (code) {
          console.log('🟢 Mobile: Google Auth Code received, exchanging for tokens...');
          try {
            // Exchange code for tokens
            const tokenResult = await exchangeGoogleCode(code, googleRequest);

            console.log('🟢 Mobile: Token exchange success', {
              hasIdToken: !!tokenResult.idToken,
              hasAccessToken: !!tokenResult.accessToken
            });

            if (tokenResult.idToken) {
              // Use InstantDB native Google sign-in with ID token
              handleGoogleLoginWithIdToken(tokenResult.idToken);
            } else if (tokenResult.accessToken) {
              // Fallback to access token approach
              handleGoogleLoginSuccess(tokenResult.accessToken);
            } else {
              throw new Error('No tokens received from exchange');
            }
          } catch (err) {
            console.error('❌ Mobile: Token exchange failed', err);
            setError(t('auth.googleLoginFailed'));
            setIsSocialLoading(false);
            setSocialLoadingType(null);
          }
        } else {
          // Fallback for Implicit Flow (shouldn't happen with new config but good for safety)
          const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
          const accessToken = googleResponse.authentication?.accessToken || googleResponse.params?.access_token;

          if (idToken) {
            handleGoogleLoginWithIdToken(idToken);
          } else if (accessToken) {
            handleGoogleLoginSuccess(accessToken);
          } else {
            console.error('❌ Mobile: No code or tokens in response');
            setError(t('auth.googleLoginFailed'));
            setIsSocialLoading(false);
            setSocialLoadingType(null);
          }
        }
      } else if (googleResponse?.type === 'error') {
        console.error('❌ Mobile: Google OAuth error', googleResponse);
        setError(t('auth.googleLoginFailed'));
        setIsSocialLoading(false);
        setSocialLoadingType(null);
      } else if (googleResponse?.type === 'dismiss') {
        console.log('⚠️ Mobile: Google OAuth dismissed by user');
        setIsSocialLoading(false);
        setSocialLoadingType(null);
      }
    };

    handleGoogleResponse();
  }, [googleResponse]);

  // Note: Facebook OAuth response is now handled directly in handleFacebookLogin
  // since we're using the native Facebook SDK which returns results immediately

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

      // Send magic code via InstantDB
      setPendingUser(userRecord);
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
        setError(err.body?.message || err.message || t('errors.tryAgain'));
        setShowVerification(false);
        setPendingUser(null);
      }
    } catch (err) {
      console.error('Login error:', err);
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
    // Join code digits and trim any whitespace
    const enteredCode = verificationCode.map(c => c.trim()).join('').trim();

    if (enteredCode.length !== 6) {
      setError(t('auth.enterFullCode'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const normalizedEmail = pendingUser?.email?.toLowerCase().trim() || email.trim().toLowerCase();

      // Verify with InstantDB
      await db.auth.signInWithMagicCode({
        email: normalizedEmail,
        code: enteredCode
      });

      // If successful, login the user
      if (pendingUser) {
        await login(pendingUser);
      } else {
        setError(t('auth.sessionExpired'));
        return;
      }
    } catch (err) {
      // Get detailed error info
      const rawError = err.body?.message || err.message || 'Unknown error';

      // Show more specific error message
      let errorMessage = t('auth.invalidCode');

      // Parse InstantDB error messages
      if (rawError.toLowerCase().includes('expired')) {
        errorMessage = t('auth.codeExpired');
      } else if (rawError.toLowerCase().includes('invalid')) {
        errorMessage = t('auth.codeInvalid');
      } else if (rawError.toLowerCase().includes('used')) {
        errorMessage = t('auth.codeAlreadyUsed');
      } else if (rawError.toLowerCase().includes('not found')) {
        errorMessage = t('auth.emailNotFound');
      } else {
        // Show the actual error for debugging
        errorMessage = `${t('auth.verificationFailed')}: ${rawError}`;
      }

      setError(errorMessage);
      setVerificationCode(['', '', '', '', '', '']);
    } finally {
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
      setError(err.body?.message || err.message || t('errors.tryAgain'));
    } finally {
      setIsResending(false);
    }
  };

  // Handle Google login button press
  const handleGoogleLogin = async () => {
    if (!isGoogleConfigured()) {
      alert(
        t('auth.notConfigured'),
        t('auth.googleNotConfigured')
      );
      return;
    }

    setError('');
    setIsSocialLoading(true);
    setSocialLoadingType('google');

    try {
      await googlePromptAsync();
    } catch (err) {
      console.error('Google login error:', err);
      setError(t('auth.googleLoginFailed'));
      setIsSocialLoading(false);
      setSocialLoadingType(null);
    }
  };

  // Handle Google login with ID token (InstantDB native sign-in)
  const handleGoogleLoginWithIdToken = async (idToken) => {
    try {
      console.log('🟢 Mobile: Using InstantDB native Google sign-in with ID token');

      // Use InstantDB native Google sign-in
      await db.auth.signInWithIdToken({
        clientName: 'google-mobile',
        idToken: idToken
      });
      console.log('✅ Mobile: signInWithIdToken successful');

      // Decode the ID token to get user info
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const userInfo = JSON.parse(jsonPayload);
      console.log('🟢 Mobile: Decoded user info:', userInfo);

      if (!userInfo.email) {
        throw new Error('Your Google account does not provide an email address.');
      }

      // Find existing user or create new one
      const normalizedEmail = userInfo.email.toLowerCase();
      const existingUser = allUsers.find(u =>
        (u.emailLower && u.emailLower === normalizedEmail) ||
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );

      let userId;
      let userData;

      if (existingUser) {
        // Update existing user
        console.log('🔵 Mobile: Updating existing user', existingUser);
        userId = existingUser.id;
        userData = {
          ...existingUser,
          name: userInfo.name || existingUser.name,
          email: userInfo.email,
          emailLower: normalizedEmail,
          avatar: userInfo.picture || existingUser.avatar,
          updatedAt: Date.now(),
          authProvider: existingUser.authProvider || 'google',
          googleId: userInfo.sub || userInfo.id,
        };
      } else {
        // Create new user
        console.log('🔵 Mobile: Creating new user');
        userId = require('../lib/instant').id();
        userData = {
          id: userId,
          name: userInfo.name || userInfo.email.split('@')[0],
          email: userInfo.email,
          emailLower: normalizedEmail,
          avatar: userInfo.picture || null,
          rating: 0,
          bio: '',
          createdAt: Date.now(),
          authProvider: 'google',
          googleId: userInfo.sub || userInfo.id,
          passwordHash: null,
        };
      }

      console.log('🔵 Mobile: Saving user to InstantDB', { userId, userData });
      // Save/update user in InstantDB
      await db.transact(
        db.tx.users[userId].update(userData)
      );
      console.log('✅ Mobile: User saved successfully');

      // Login the user
      await login(userData);

      alert(
        t('auth.welcomeBack'),
        t('auth.loginSuccess')
      );
    } catch (err) {
      console.error('❌ Mobile: Google login with ID token error:', err);
      setError(err.message || t('auth.googleLoginFailed'));
    } finally {
      setIsSocialLoading(false);
      setSocialLoadingType(null);
    }
  };

  // Handle successful Google login (legacy - using access token)
  const handleGoogleLoginSuccess = async (accessToken) => {
    try {
      // Fetch Google user profile
      const profile = await fetchGoogleUserProfile(accessToken);

      // Fetch Google contacts for friends feature
      const contacts = await fetchGoogleContacts(accessToken);

      // Find or create user in InstantDB
      const user = await findOrCreateSocialUser(profile, contacts, allUsers);

      // Login the user
      await login(user);

      alert(
        t('auth.welcomeBack'),
        t('auth.loginSuccess')
      );
    } catch (err) {
      console.error('Google login success handler error:', err);
      setError(t('auth.googleLoginFailed'));
    } finally {
      setIsSocialLoading(false);
      setSocialLoadingType(null);
    }
  };

  // Handle Facebook login button press
  const handleFacebookLogin = async () => {
    if (!isFacebookConfigured()) {
      alert(
        t('auth.notConfigured'),
        t('auth.facebookNotConfigured')
      );
      return;
    }

    // Log debug info for troubleshooting
    if (__DEV__) {
      console.log('Facebook Auth Debug Info:', getFacebookAuthDebugInfo());
    }

    setError('');
    setIsSocialLoading(true);
    setSocialLoadingType('facebook');

    try {
      // Use native Facebook SDK - this will open Facebook app if installed
      const result = await facebookPromptAsync();

      // Log the result for debugging
      if (__DEV__) {
        console.log('Facebook native login result:', result);
      }

      // Handle result from native Facebook SDK
      if (result?.type === 'success' && result.accessToken) {
        // Native SDK returns accessToken directly
        console.log('🟢 Mobile: Facebook native login successful, token:', result.accessToken.substring(0, 10) + '...');

        // Use InstantDB native Facebook sign-in to establish session
        try {
          console.log('🟢 Mobile: Using InstantDB native Facebook sign-in');
          await db.auth.signInWithIdToken({
            clientName: 'facebook-mobile', // Needs to match InstantDB config
            idToken: result.accessToken
          });
          console.log('✅ Mobile: InstantDB Facebook signInWithIdToken successful');
        } catch (dbAuthError) {
          console.error('❌ Mobile: InstantDB Facebook auth failed:', dbAuthError);
          console.warn('⚠️ Mobile: Proceeding with legacy user creation despite auth error');
        }

        await handleFacebookLoginSuccess(result.accessToken);
      } else if (result?.type === 'cancel') {
        // User cancelled
        setIsSocialLoading(false);
        setSocialLoadingType(null);
      } else if (result?.type === 'error') {
        setError(result.error || t('auth.facebookLoginFailed'));
        setIsSocialLoading(false);
        setSocialLoadingType(null);
      }
    } catch (err) {
      console.error('Facebook login error:', err);
      const errorMessage = err.message || t('auth.facebookLoginFailed');
      setError(errorMessage);
      setIsSocialLoading(false);
      setSocialLoadingType(null);
    }
  };

  // Handle successful Facebook login
  const handleFacebookLoginSuccess = async (accessToken) => {
    try {
      // Fetch Facebook user profile
      const profile = await fetchFacebookUserProfile(accessToken);

      // Fetch Facebook friends who also use the app
      const friends = await fetchFacebookFriends(accessToken);

      // Find or create user in InstantDB
      const user = await findOrCreateSocialUser(profile, friends, allUsers);

      // Login the user
      await login(user);

      alert(
        t('auth.welcomeBack'),
        t('auth.loginSuccess')
      );
    } catch (err) {
      console.error('Facebook login success handler error:', err);
      setError(t('auth.facebookLoginFailed'));
    } finally {
      setIsSocialLoading(false);
      setSocialLoadingType(null);
    }
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
            {t('profile.tagline')}
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
                    placeholder={t('auth.passwordPlaceholder')}
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

              {/* Social Buttons */}
              <View style={[styles.socialButtons, { flexDirection: rtlStyles.row }]}>
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    { borderColor: themeColors.border, flexDirection: rtlStyles.row },
                    (isSocialLoading && socialLoadingType === 'google') && styles.buttonDisabled
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={isSocialLoading || isLoading}
                  activeOpacity={0.8}
                >
                  {isSocialLoading && socialLoadingType === 'google' ? (
                    <ActivityIndicator size="small" color="#DB4437" />
                  ) : (
                    <>
                      <View style={[styles.socialIconWrapper, { backgroundColor: 'rgba(219, 68, 55, 0.1)' }]}>
                        <Icon name="logo-google" size={18} color="#DB4437" />
                      </View>
                      <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                        {t('auth.google')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    { borderColor: themeColors.border, flexDirection: rtlStyles.row },
                    (isSocialLoading && socialLoadingType === 'facebook') && styles.buttonDisabled
                  ]}
                  onPress={handleFacebookLogin}
                  disabled={isSocialLoading || isLoading}
                  activeOpacity={0.8}
                >
                  {isSocialLoading && socialLoadingType === 'facebook' ? (
                    <ActivityIndicator size="small" color="#4267B2" />
                  ) : (
                    <>
                      <View style={[styles.socialIconWrapper, { backgroundColor: 'rgba(66, 103, 178, 0.1)' }]}>
                        <Icon name="logo-facebook" size={18} color="#4267B2" />
                      </View>
                      <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                        {t('auth.facebook')}
                      </Text>
                    </>
                  )}
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
                  <Text style={styles.primaryButtonText}>{t('auth.verifyCode')}</Text>
                )}
              </TouchableOpacity>

              {/* Resend Code Section */}
              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, { color: themeColors.textSecondary }]}>
                  {t('auth.didntReceiveCode')}
                </Text>
                {resendCooldown > 0 ? (
                  <Text style={[styles.cooldownText, { color: themeColors.textSecondary }]}>
                    {t('auth.resendIn')} {resendCooldown}s
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
                        {t('auth.resendCode')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
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
  socialIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
