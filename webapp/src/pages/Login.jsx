import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { verifyPassword } from '../utils/password';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState(null);
  const [isFacebookReady, setIsFacebookReady] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [verificationContext, setVerificationContext] = useState(null);
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const inputRefs = useRef([]);
  const googleButtonRef = useRef(null);
  const isProcessingGoogleAuth = useRef(false);

  // Query for existing user by email (when Google user email is set)
  const { data: usersData } = db.useQuery({
    users: googleUserEmail ? {
      $: {
        where: { emailLower: googleUserEmail.toLowerCase() }
      }
    } : {}
  });

  // Query all users for email lookup (we'll filter client-side)
  const { data: allUsersData } = db.useQuery({ users: {} });
  const allUsers = allUsersData?.users || [];

  const existingGoogleUser = usersData?.users?.[0];

  useEffect(() => {
    // Initialize settings on mount
    const settingsStore = useSettingsStore.getState();
    settingsStore.initSettings();
  }, []);

  useEffect(() => {
    const storedContext = sessionStorage.getItem('pending_login_context');

    if (storedContext) {
      try {
        const parsedContext = JSON.parse(storedContext);
        setVerificationContext(parsedContext);
        setShowVerification(true);
      } catch (err) {
        console.error('Failed to parse pending login context:', err);
        sessionStorage.removeItem('pending_login_context');
      }
    }
  }, []);

  useEffect(() => {
    // Initialize Google Sign-In when component mounts and Google API is loaded
    const initGoogleSignIn = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        console.warn('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in your .env file.');
        return;
      }

      if (window.google && googleButtonRef.current && !googleButtonRef.current.hasChildNodes()) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignIn,
          });

          window.google.accounts.id.renderButton(
            googleButtonRef.current,
            {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              width: '100%',
            }
          );
        } catch (err) {
          console.error('Error initializing Google Sign-In:', err);
        }
      }
    };

    // Check if Google API is already loaded
    if (window.google) {
      initGoogleSignIn();
    } else {
      // Wait for Google API to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initGoogleSignIn();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogle), 10000);
    }

    // Cleanup function
    return () => {
      // Cleanup if needed
    };
  }, []);

  // Handle user creation/update when Google user email and query data are available
  useEffect(() => {
    console.log('🔵 useEffect triggered', { googleUserEmail, usersData, existingGoogleUser });
    // Check if we have an email and the query has completed (usersData is defined)
    // usersData will be defined even if no user is found (empty array)
    if (googleUserEmail && usersData !== undefined && !isProcessingGoogleAuth.current) {
      console.log('✅ Calling handleGoogleUserAuth');
      isProcessingGoogleAuth.current = true;
      handleGoogleUserAuth();
    } else {
      console.log('⚠️ Not calling handleGoogleUserAuth', {
        hasEmail: !!googleUserEmail,
        usersDataDefined: usersData !== undefined,
        isProcessing: isProcessingGoogleAuth.current
      });
    }
  }, [googleUserEmail, usersData]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!facebookAppId) {
      console.warn('Facebook App ID not configured. Set VITE_FACEBOOK_APP_ID in your environment variables. Current value:', import.meta.env.VITE_FACEBOOK_APP_ID);
      // We don't return here so that we don't break the hook rules or logic, 
      // but the button will handle the error on click.
    }

    let isMounted = true;

    const initializeFacebookSDK = () => {
      try {
        if (facebookAppId) {
          window.FB.init({
            appId: facebookAppId,
            cookie: true,
            xfbml: false,
            version: 'v19.0',
          });
        }

        if (isMounted) {
          setIsFacebookReady(true);
        }
      } catch (err) {
        console.error('Error initializing Facebook SDK:', err);
      }
    };

    if (window.FB) {
      initializeFacebookSDK();
    } else {
      const previousFbAsyncInit = window.fbAsyncInit;
      window.fbAsyncInit = () => {
        if (typeof previousFbAsyncInit === 'function') {
          previousFbAsyncInit();
        }
        initializeFacebookSDK();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [facebookAppId]);

  const sanitizeUserSnapshot = (user) => {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  };

  const resetVerificationSession = () => {
    sessionStorage.removeItem('pending_login_context');
    sessionStorage.removeItem('pending_login_method');
    setShowVerification(false);
    setVerificationCode(['', '', '', '', '', '']);
    setVerificationContext(null);
  };

  const startVerificationFlow = async ({ user, method }) => {
    if (!user?.id || !user?.email) {
      throw new Error('User data missing required fields for verification.');
    }

    const context = {
      method,
      userId: user.id,
      email: user.email,
      userSnapshot: sanitizeUserSnapshot(user),
    };

    sessionStorage.setItem('pending_login_context', JSON.stringify(context));
    sessionStorage.setItem('pending_login_method', method);
    setVerificationContext(context);
    setVerificationCode(['', '', '', '', '', '']);
    setShowVerification(true);

    try {
      await db.auth.sendMagicCode({ email: user.email.toLowerCase() });
      setError('');
    } catch (err) {
      console.error('Error sending magic code:', err);
      setError(err.body?.message || err.message || 'Failed to send verification code. Please try again.');
      setShowVerification(false);
      setVerificationContext(null);
    }
  };


  const handleGoogleSignIn = async (response) => {
    console.log('🟢 handleGoogleSignIn called', { response });
    setIsGoogleLoading(true);
    setError('');

    try {
      // Use InstantDB native Google sign-in
      const credential = response.credential;
      console.log('🟢 Got credential, calling signInWithIdToken');
      await db.auth.signInWithIdToken({
        clientName: 'google-web2',
        idToken: credential
      });
      console.log('✅ signInWithIdToken successful');

      // The above will establish the auth session in InstantDB.
      // Now we need to decode the token to get the email for our user record.
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const userInfo = JSON.parse(jsonPayload);
      console.log('🟢 Decoded user info:', userInfo);

      // Store Google user email to trigger query and auth handling
      console.log('🟢 Setting googleUserEmail to:', userInfo.email);
      setGoogleUserEmail(userInfo.email);

      // Store full user info in ref for later use
      googleUserInfoRef.current = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        emailVerified: userInfo.email_verified,
      };
      console.log('🟢 Stored user info in ref:', googleUserInfoRef.current);
    } catch (err) {
      console.error('Google sign-in error:', err);
      console.error('Error details:', {
        message: err.message,
        body: err.body,
        status: err.status,
        stack: err.stack
      });
      setError(`Failed to sign in with Google: ${err.message || 'Please try again.'}`);
      setIsGoogleLoading(false);
      setGoogleUserEmail(null);
    }
  };

  const googleUserInfoRef = useRef(null);

  const handleGoogleUserAuth = async () => {
    if (!googleUserInfoRef.current) return;

    try {
      const googleUser = googleUserInfoRef.current;
      console.log('🔵 handleGoogleUserAuth started', { googleUser });

      if (!googleUser.email) {
        throw new Error('Your Google account does not provide an email address. Please update your Google settings or use another login method.');
      }

      let userId;
      let userData;

      if (existingGoogleUser) {
        // Update existing user
        console.log('🔵 Updating existing user', existingGoogleUser);
        userId = existingGoogleUser.id;
        userData = {
          ...existingGoogleUser,
          name: googleUser.name,
          email: googleUser.email,
          emailLower: googleUser.email.toLowerCase(),
          avatar: googleUser.picture,
          updatedAt: Date.now(),
          authProvider: existingGoogleUser.authProvider || 'google',
        };
      } else {
        // Create new user
        console.log('🔵 Creating new user');
        userId = id();
        userData = {
          id: userId,
          name: googleUser.name,
          email: googleUser.email,
          emailLower: googleUser.email.toLowerCase(),
          avatar: googleUser.picture,
          rating: 0,
          bio: '',
          createdAt: Date.now(),
          authProvider: 'google',
          passwordHash: null,
        };
      }

      console.log('🔵 Saving user to InstantDB', { userId, userData });
      // Save/update user in InstantDB
      await db.transact(
        db.tx.users[userId].update(userData)
      );
      console.log('✅ User saved successfully');

      // If email is verified by Google, skip magic code
      if (googleUser.emailVerified) {
        console.log('✅ Email verified, logging in and redirecting to /feed');
        login(userData);
        console.log('✅ Login function called');
        navigate('/feed');
        console.log('✅ Navigate function called');
      } else {
        console.log('⚠️ Email not verified, starting verification flow');
        await startVerificationFlow({ user: userData, method: 'google' });
      }
    } catch (err) {
      console.error('❌ Error creating/updating user:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
      setGoogleUserEmail(null);
      googleUserInfoRef.current = null;
      isProcessingGoogleAuth.current = false;
    }
  };

  const handleFacebookLogin = async () => {
    console.log('🔵 handleFacebookLogin called - starting Facebook SDK login');
    setError('');

    if (typeof window === 'undefined' || !window.FB) {
      setError('Facebook SDK is not ready. Please try again in a moment.');
      return;
    }

    if (!facebookAppId) {
      setError('Facebook login is not configured. Please contact support.');
      return;
    }

    setIsFacebookLoading(true);

    try {
      const authResponse = await new Promise((resolve, reject) => {
        window.FB.login(
          (response) => {
            if (response?.status === 'connected') {
              resolve(response);
            } else {
              reject(new Error('Facebook login was cancelled or failed.'));
            }
          },
          { scope: 'email' }
        );
      });

      console.log('🔵 handleFacebookLogin: Facebook SDK login successful', { authResponse });

      if (!authResponse?.authResponse) {
        throw new Error('Missing Facebook authentication response.');
      }

      // Authenticate with InstantDB using the Facebook access token
      try {
        console.log('🔵 InstantDB Facebook Auth: Calling signInWithIdToken');
        await db.auth.signInWithIdToken({
          clientName: 'facebook-web', // Needs to match InstantDB config
          idToken: authResponse.authResponse.accessToken
        });
        console.log('✅ InstantDB Facebook Auth: Success');
      } catch (dbAuthError) {
        console.error('❌ InstantDB Facebook Auth Failed:', dbAuthError);
        // We continue even if this fails, as the user might not be in InstantDB auth yet
        // or the client config might be missing. The legacy flow handled this manualy.
        // However, for "Direct Login" to work properly, this needs to succeed eventually.
        console.warn('⚠️ Proceeding with legacy user creation despite auth error (check clientName in InstantDB dashboard)');
      }

      const profile = await new Promise((resolve, reject) => {
        window.FB.api(
          '/me',
          { fields: 'id,name,email,picture.type(large)' },
          (profileResponse) => {
            if (profileResponse && !profileResponse.error) {
              resolve(profileResponse);
            } else {
              reject(new Error(profileResponse?.error?.message || 'Failed to fetch Facebook profile.'));
            }
          }
        );
      });

      console.log('🔵 Facebook Profile Fetched', profile);

      if (!profile?.email) {
        throw new Error('Your Facebook account does not provide an email address. Please update your Facebook settings or use another login method.');
      }

      // Find user from allUsers array
      const normalizedEmail = profile.email.toLowerCase();
      const existingUserRecord = allUsers.find(u =>
        (u.emailLower && u.emailLower === normalizedEmail) ||
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );
      const timestamp = Date.now();
      const avatarFromFacebook = profile.picture?.data?.url || `https://graph.facebook.com/${profile.id}/picture?type=large`;
      let userId;
      let userData;

      if (existingUserRecord) {
        console.log('🔵 Updating existing Facebook user', existingUserRecord.id);
        userId = existingUserRecord.id;
        userData = {
          ...existingUserRecord,
          name: profile.name || existingUserRecord.name,
          email: profile.email,
          emailLower: profile.email.toLowerCase(),
          avatar: avatarFromFacebook || existingUserRecord.avatar,
          facebookId: profile.id,
          authProvider: existingUserRecord.authProvider || 'facebook',
          updatedAt: timestamp,
        };
      } else {
        // Create new user
        console.log('🔵 Creating new Facebook user');
        userId = id();
        userData = {
          id: userId,
          name: profile.name || 'Facebook User',
          email: profile.email,
          emailLower: profile.email.toLowerCase(),
          avatar: avatarFromFacebook,
          rating: 0,
          bio: '',
          createdAt: timestamp,
          authProvider: 'facebook',
          facebookId: profile.id,
          passwordHash: null,
        };
      }

      await db.transact(
        db.tx.users[userId].update(userData)
      );
      console.log('✅ User data saved to InstantDB');

      // Direct Login (Skip Verification)
      console.log('✅ Direct Login: Logging in and redirecting');
      login(userData);
      navigate('/feed');

      // await startVerificationFlow({ user: userData, method: 'facebook' }); // Removed legacy flow
    } catch (err) {
      console.error('❌ Facebook login error:', err);
      setError(err.message || 'Failed to sign in with Facebook. Please try again.');
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('pleaseEnterEmail'));
      return;
    }

    if (!password) {
      setError(t('pleaseEnterPassword'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('pleaseEnterValidEmail'));
      return;
    }

    setIsAuthenticating(true);

    try {
      const trimmedEmail = email.trim();
      const normalizedEmail = trimmedEmail.toLowerCase();

      // Find user from the allUsers array (filtered client-side)
      const userRecord = allUsers.find(u =>
        (u.emailLower && u.emailLower === normalizedEmail) ||
        (u.email && u.email.toLowerCase() === normalizedEmail)
      );

      if (!userRecord) {
        console.log('User not found for email:', trimmedEmail);
        setError(t('accountNotFound'));
        setIsAuthenticating(false);
        return;
      }

      if (!userRecord.passwordHash) {
        console.log('User found but no password hash - social login only');
        setError(t('socialLoginOnly'));
        setIsAuthenticating(false);
        return;
      }

      console.log('Verifying password for user:', userRecord.email);
      const isValidPassword = await verifyPassword(password, userRecord.passwordHash);

      if (!isValidPassword) {
        console.log('Password verification failed');
        setError(t('incorrectPassword'));
        setIsAuthenticating(false);
        return;
      }

      console.log('Password verified successfully, starting verification flow');
      await startVerificationFlow({ user: userRecord, method: 'password' });
    } catch (err) {
      console.error('Error logging in with password:', err);
      setError(err.message || t('failedToLogin') || 'Failed to log in. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCodeChange = (index, value) => {
    // Handle paste event - if user pastes full code
    if (value.length > 1) {
      const pastedCode = value.replace(/\D/g, '').slice(0, 6);
      if (pastedCode.length > 0) {
        const newCode = [...verificationCode];
        for (let i = 0; i < pastedCode.length && i < 6; i++) {
          newCode[i] = pastedCode[i];
        }
        setVerificationCode(newCode);
        // Focus appropriate input after paste
        const focusIndex = Math.min(pastedCode.length, 5);
        setTimeout(() => inputRefs.current[focusIndex]?.focus(), 0);
      }
      return;
    }

    // Only allow digits
    const digit = value.replace(/\D/g, '');

    const newCode = [...verificationCode];
    newCode[index] = digit;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (digit && index < 5) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!verificationCode[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      } else if (verificationCode[index]) {
        // Clear current input and stay
        const newCode = [...verificationCode];
        newCode[index] = '';
        setVerificationCode(newCode);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handleCodeFocus = (index) => {
    // Select content on focus for easier editing
    inputRefs.current[index]?.select();
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const enteredCode = verificationCode.join('');

      if (enteredCode.length !== 6) {
        setError(t('enterFullCode') || 'Please enter the full 6-digit code');
        setIsVerifying(false);
        return;
      }

      let context = verificationContext;
      if (!context) {
        const storedContext = sessionStorage.getItem('pending_login_context');
        if (storedContext) {
          context = JSON.parse(storedContext);
          setVerificationContext(context);
        }
      }

      if (!context?.email) {
        setError(t('verificationSessionExpired'));
        resetVerificationSession();
        setIsVerifying(false);
        return;
      }

      // Verify magic code via InstantDB
      await db.auth.signInWithMagicCode({
        email: context.email.toLowerCase(),
        code: enteredCode
      });

      let userData = context.userSnapshot;

      if (!userData) {
        // Find user from allUsers array
        userData = allUsers.find(u => u.id === context.userId) || null;
        if (!userData) {
          console.error('User not found during verification:', context.userId);
        }
      }

      if (!userData) {
        setError(t('accountNotFound'));
        resetVerificationSession();
        setIsVerifying(false);
        return;
      }

      login(userData);
      resetVerificationSession();
      setEmail('');
      setPassword('');
      setVerificationCode(['', '', '', '', '', '']);
      navigate('/feed');
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(t('invalidVerificationCode') || 'Invalid code. Please try again.');
      setVerificationCode(['', '', '', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };
  return (
    <div className={`min-h-screen flex ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-rose-500 to-pink-500 p-12 flex-col justify-between text-white relative overflow-hidden ${isRTL ? 'order-2' : ''}`}>
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold mb-4">DOTO</h1>
          <p className="text-xl text-red-50 mb-2">Do One Thing Others</p>
          <p className="text-red-100">{t('buildingCommunity')}</p>
        </div>
        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-lg font-semibold mb-2">{t('joinThousands')}</p>
            <div className="flex gap-4 text-sm text-red-50">
              <div>
                <div className="font-bold text-white text-2xl">10K+</div>
                <div>{t('activeUsers')}</div>
              </div>
              <div>
                <div className="font-bold text-white text-2xl">50K+</div>
                <div>{t('tasksCompleted')}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className={`flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 ${isRTL ? 'order-1' : ''}`}>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent mb-2">DOTO</h1>
            <p className="text-gray-500 dark:text-gray-400">Do One Thing Others</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('welcomeBack')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t('signInToContinue')}</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
                {error}
              </div>
            )}

            {!showVerification ? (
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('emailAddress')}</label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('verificationCodeAfterLogin') || `${t('verificationCodeSent')} ${t('checkEmailAndEnter')}`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 pe-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center text-center"
                  style={{ textAlign: 'center' }}
                >
                  {isAuthenticating ? (t('loading') || 'Loading...') : t('logIn')}
                </button>
              </form>
            ) : (
              <>
                <button
                  onClick={() => {
                    resetVerificationSession();
                    setError('');
                  }}
                  className={`mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <svg className={`w-5 h-5 ${isRTL ? 'rtl-flip' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('back')}
                </button>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('enterVerificationCode')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  {t('verificationCodeSent')} <span className="font-semibold text-gray-900 dark:text-white">{verificationContext?.email || email}</span>. {t('checkEmailAndEnter')}
                </p>

                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                      {t('verificationCode')}
                    </label>
                    <div className={`flex gap-2 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {verificationCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(index, e)}
                          onFocus={() => handleCodeFocus(index)}
                          className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all caret-red-500"
                          style={{ textAlign: 'center', caretColor: 'transparent' }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                      {t('verificationCodeSentTo') || 'Code sent to'} <span className="font-semibold">{verificationContext?.email || email}</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={verificationCode.join('').length !== 6 || isVerifying}
                    className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center text-center"
                    style={{ textAlign: 'center' }}
                  >
                    {isVerifying ? (t('loading') || 'Loading...') : t('verifyCode')}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t('orContinueWith')}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isFacebookLoading}
                  onClick={() => {
                    if (!facebookAppId) {
                      setError('Facebook login is not configured. Missing VITE_FACEBOOK_APP_ID.');
                      return;
                    }
                    if (!isFacebookReady) {
                      setError('Facebook SDK is still loading. Please wait.');
                      return;
                    }
                    handleFacebookLogin();
                  }}
                  title={
                    !facebookAppId
                      ? 'Facebook login not configured'
                      : !isFacebookReady
                        ? 'Loading Facebook login...'
                        : isFacebookLoading
                          ? 'Connecting to Facebook...'
                          : t('facebook')
                  }
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {isFacebookLoading ? (t('loading') || 'Loading...') : t('facebook')}
                </button>
                <div
                  ref={googleButtonRef}
                  className="flex items-center justify-center w-full"
                  style={{ minHeight: '48px' }}
                >
                  {(!window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
                    <button
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-700 dark:text-gray-300 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isGoogleLoading || !import.meta.env.VITE_GOOGLE_CLIENT_ID}
                      onClick={() => {
                        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                          setError('Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.');
                        } else {
                          setError('Google Sign-In is loading. Please wait...');
                        }
                      }}
                      title={!import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Google Sign-In not configured' : 'Loading Google Sign-In...'}
                    >
                      {isGoogleLoading ? (
                        <span className="text-sm">{t('loading') || 'Loading...'}</span>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          {t('google')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('dontHaveAccount')} <Link to="/register" className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-500">{t('signUp')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
