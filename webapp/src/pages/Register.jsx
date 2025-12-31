import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, X, MapPin, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../utils/translations';
import { db } from '../lib/instant';
import { id } from '@instantdb/react';
import { hashPassword } from '../utils/password';
import { isEmailJSConfigured } from '../utils/emailService';
import { ISRAEL_NOMINATIM_PARAMS } from '../utils/israelBounds';

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { language } = useSettingsStore();
  const t = useTranslation();
  const isRTL = language === 'he';

  const emailFromSession = sessionStorage.getItem('email') || '';
  const phoneFromSession = sessionStorage.getItem('phone') || '';
  const pendingLoginContext = sessionStorage.getItem('pending_login_context');

  // Only load existing user data if coming from a verification flow
  // (has pending login context)
  const isFromVerificationFlow = Boolean(pendingLoginContext);

  const [phone, setPhone] = useState(phoneFromSession);
  const trimmedPhone = phone.trim();
  const trimmedEmail = emailFromSession.trim();

  // Query for existing user by phone (only if phone exists AND coming from verification flow)
  const { data: usersDataByPhone } = db.useQuery({
    users: (trimmedPhone && isFromVerificationFlow) ? {
      $: {
        where: { phone: trimmedPhone }
      }
    } : {}
  });

  const existingUserByPhone = usersDataByPhone?.users?.[0];

  // Query for existing user by email (only if email exists, no phone match, AND coming from verification flow)
  const { data: usersDataByEmail } = db.useQuery({
    users: (trimmedEmail && !existingUserByPhone && isFromVerificationFlow) ? {
      $: {
        where: { emailLower: trimmedEmail.toLowerCase() }
      }
    } : {}
  });

  const existingUserByEmail = usersDataByEmail?.users?.[0];
  const existingUser = existingUserByPhone || existingUserByEmail;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    location: '',
    password: '',
    confirmPassword: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState(null);
  const [isFacebookReady, setIsFacebookReady] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationContext, setVerificationContext] = useState(null);
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const fileInputRef = useRef(null);
  const googleButtonRef = useRef(null);
  const googleUserInfoRef = useRef(null);
  const inputRefs = useRef([]);
  const locationInputRef = useRef(null);
  const locationSuggestionsRef = useRef(null);
  const locationSearchTimeoutRef = useRef(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Query for existing user by email (when Google user email is set)
  const { data: usersDataByEmailForGoogle } = db.useQuery({
    users: googleUserEmail ? {
      $: {
        where: { emailLower: googleUserEmail.toLowerCase() }
      }
    } : {}
  });

  // Query all users for email lookup (we'll filter client-side)
  const { data: allUsersData } = db.useQuery({ users: {} });
  const allUsers = allUsersData?.users || [];

  const existingGoogleUser = usersDataByEmailForGoogle?.users?.[0];

  useEffect(() => {
    // Initialize settings on mount
    const settingsStore = useSettingsStore.getState();
    settingsStore.initSettings();

    // Clear sessionStorage if not coming from verification flow (new user)
    if (!isFromVerificationFlow) {
      // Clear any leftover session data for new registrations
      sessionStorage.removeItem('email');
      sessionStorage.removeItem('phone');
      setPhone('');
    }
  }, []);

  useEffect(() => {
    // Update form when existing user data loads (from phone or email)
    // Only do this if coming from verification flow
    if (existingUser && isFromVerificationFlow) {
      setFormData((prev) => ({
        ...prev,
        name: existingUser.name || '',
        email: existingUser.email || emailFromSession || '',
        age: existingUser.age?.toString() || '',
        location: existingUser.location || '',
        password: '',
        confirmPassword: '',
      }));
      setProfileImagePreview(existingUser.avatar || null);
      if (existingUser.phone) {
        setPhone(existingUser.phone);
      }
    } else if (!isFromVerificationFlow) {
      // Clear form for new users
      setFormData({
        name: '',
        email: '',
        age: '',
        location: '',
        password: '',
        confirmPassword: '',
      });
      setProfileImagePreview(null);
      setPhone('');
    }
  }, [existingUser, emailFromSession, isFromVerificationFlow]);

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

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Handle user creation/update when Google user email and existing user data are available
  useEffect(() => {
    if (googleUserEmail && existingGoogleUser !== undefined) {
      handleGoogleUserAuth();
    }
  }, [googleUserEmail, existingGoogleUser]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!facebookAppId) {
      console.warn('Facebook App ID not configured. Set VITE_FACEBOOK_APP_ID in your environment variables.');
      return;
    }

    let isMounted = true;

    const initializeFacebookSDK = () => {
      try {
        window.FB.init({
          appId: facebookAppId,
          cookie: true,
          xfbml: false,
          version: 'v19.0',
        });

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

  // Search for location autocomplete suggestions
  const searchLocations = async (query) => {
    if (!query || query.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        limit: '5',
        ...ISRAEL_NOMINATIM_PARAMS,
        addressdetails: '1'
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'DOTO-App/1.0'
          }
        }
      );
      const data = await response.json();
      const suggestions = data
        .filter(item => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          return lat >= 29.4 && lat <= 33.5 && lon >= 34.2 && lon <= 35.9;
        })
        .map(item => ({
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          displayName: item.display_name,
          address: item.address || {}
        }));

      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Location search error:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Handle location input change with debouncing
  const handleLocationChange = (e) => {
    const value = e.target.value;
    handleChange(e); // Update form data

    // Clear previous timeout
    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
    }

    // Debounce search
    locationSearchTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  // Handle location suggestion selection
  const handleLocationSuggestionSelect = (suggestion) => {
    setFormData({
      ...formData,
      location: suggestion.displayName
    });
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Close suggestions when clicking outside and cleanup timeout
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        locationSuggestionsRef.current &&
        !locationSuggestionsRef.current.contains(event.target) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target)
      ) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (locationSearchTimeoutRef.current) {
        clearTimeout(locationSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('imageSizeShouldBeLess'));
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGoogleSignIn = async (response) => {
    setIsGoogleLoading(true);
    setError('');

    try {
      // Use InstantDB native Google sign-in
      const credential = response.credential;
      await db.auth.signInWithIdToken({
        clientName: 'google-web2',
        idToken: credential
      });

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

      // Store Google user email to trigger query and auth handling
      setGoogleUserEmail(userInfo.email);

      // Store full user info in ref for later use
      googleUserInfoRef.current = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        emailVerified: userInfo.email_verified,
      };
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setIsGoogleLoading(false);
      setGoogleUserEmail(null);
    }
  };

  const handleGoogleUserAuth = async () => {
    if (!googleUserInfoRef.current) return;

    try {
      const googleUser = googleUserInfoRef.current;

      if (!googleUser.email) {
        throw new Error('Your Google account does not provide an email address. Please update your Google settings or use another login method.');
      }

      let userId;
      let userData;

      if (existingGoogleUser) {
        // Update existing user
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

      // Save/update user in InstantDB
      await db.transact(
        db.tx.users[userId].update(userData)
      );

      // If email is verified by Google, skip magic code
      if (googleUser.emailVerified) {
        login(userData);
        navigate('/feed');
      } else {
        await startVerificationFlow({ user: userData, method: 'google' });
      }
    } catch (err) {
      console.error('Error creating/updating user:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
      setGoogleUserEmail(null);
      googleUserInfoRef.current = null;
    }
  };

  const handleFacebookLogin = async () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(t('pleaseEnterName'));
      return;
    }

    if (!formData.email.trim()) {
      setError(t('pleaseEnterEmail'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError(t('pleaseEnterValidEmail'));
      return;
    }

    if (!formData.age || parseInt(formData.age) < 13 || parseInt(formData.age) > 120) {
      setError(t('pleaseEnterValidAge'));
      return;
    }

    if (!formData.location.trim()) {
      setError(t('pleaseEnterLocation'));
      return;
    }

    // Only update existing user if coming from verification flow AND user exists
    // Otherwise, always create a new user (this is a registration, not an update)
    const isUpdatingUser = Boolean(existingUser && isFromVerificationFlow);
    const passwordValue = (formData.password || '').trim();
    const confirmPasswordValue = (formData.confirmPassword || '').trim();
    const isPasswordChangeRequested = passwordValue.length > 0 || confirmPasswordValue.length > 0;

    // Only require password for new users or when updating password
    if (!isUpdatingUser || isPasswordChangeRequested) {
      if (!passwordValue) {
        setError(t('pleaseEnterPassword'));
        return;
      }

      if (passwordValue.length < 8) {
        setError(t('passwordRequirements'));
        return;
      }

      if (passwordValue !== confirmPasswordValue) {
        setError(t('passwordsMustMatch'));
        return;
      }
    }

    setIsSubmitting(true);

    const normalizedEmail = formData.email.trim();
    const normalizedEmailLower = normalizedEmail.toLowerCase();

    try {
      // Check if email is already taken by another user (filter from allUsers)
      // Only prevent registration if email exists AND we're not updating that same user
      const existingUserByEmailCheck = allUsers.find(u =>
        (u.emailLower && u.emailLower === normalizedEmailLower) ||
        (u.email && u.email.toLowerCase() === normalizedEmailLower)
      );

      // If email exists and we're not updating that same user, prevent registration
      if (existingUserByEmailCheck && (!isUpdatingUser || existingUserByEmailCheck.id !== existingUser?.id)) {
        setError('This email is already registered. Please use a different email or log in instead.');
        setIsSubmitting(false);
        return;
      }

      // In production, upload image to cloud storage and get URL
      // For now, use data URL or placeholder
      const avatarUrl = profileImagePreview || 'https://i.pravatar.cc/150?u=' + formData.name;

      let userId;
      let userData;

      let passwordHashValue = existingUser?.passwordHash || null;

      if (!isUpdatingUser || isPasswordChangeRequested) {
        passwordHashValue = await hashPassword(passwordValue);
      }

      // Only update if we're coming from verification flow AND user exists
      // Otherwise, always create a new user
      if (isUpdatingUser && existingUser && isFromVerificationFlow) {
        // Update existing user - ensure emailLower is set
        userId = existingUser.id;
        userData = {
          ...existingUser,
          name: formData.name.trim(),
          email: normalizedEmail,
          emailLower: normalizedEmailLower, // Always ensure emailLower is set
          age: parseInt(formData.age),
          location: formData.location.trim(),
          avatar: avatarUrl,
          updatedAt: Date.now(),
          passwordHash: passwordHashValue,
          authProvider: existingUser.authProvider || 'email',
          ...(trimmedPhone && { phone: trimmedPhone }),
        };
      } else {
        // Create new user
        userId = id();
        userData = {
          id: userId,
          name: formData.name.trim(),
          email: normalizedEmail,
          emailLower: normalizedEmailLower,
          age: parseInt(formData.age),
          location: formData.location.trim(),
          ...(trimmedPhone && { phone: trimmedPhone }),
          avatar: avatarUrl,
          rating: 0,
          bio: '',
          createdAt: Date.now(),
          passwordHash: passwordHashValue,
          authProvider: 'email',
        };
      }

      // Save/update user in InstantDB
      await db.transact(
        db.tx.users[userId].update(userData)
      );

      // Start verification flow for email/password registration
      await startVerificationFlow({ user: userData, method: 'email' });
    } catch (err) {
      console.error('Failed to register:', err);
      setError(err.message || t('failedToRegister'));
      setIsSubmitting(false);
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
      setFormData({
        name: '',
        email: '',
        age: '',
        location: '',
        password: '',
        confirmPassword: '',
      });
      setPhone('');
      setVerificationCode(['', '', '', '', '', '']);

      // Clear session storage
      sessionStorage.removeItem('phone');
      sessionStorage.removeItem('email');

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
    <div className={`min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : ''}`}>
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          {!showVerification ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {existingUser ? t('updateYourProfile') : t('completeYourProfile')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                {existingUser ? t('updateYourInformation') : t('tellUsAboutYourself')}
              </p>

              {error && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profileImage')}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {profileImagePreview ? (
                        <div className="relative">
                          <img
                            src={profileImagePreview}
                            alt="Profile preview"
                            className="w-24 h-24 rounded-full object-cover ring-4 ring-gray-100 dark:ring-gray-700"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Upload size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {profileImagePreview ? t('changeImage') : t('uploadImage')}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('pngJpgUpTo5MB')}</p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('fullName')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('enterFullNamePlaceholder')}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('emailAddress')} *
                  </label>
                  <div className="relative">
                    <Mail size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      className="w-full ps-10 pe-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('password')} {!existingUser && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="********"
                      autoComplete="new-password"
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 pe-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {existingUser ? t('optionalChangePassword') : t('passwordHelper')}
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('confirmPassword')} {!existingUser && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="********"
                      autoComplete="new-password"
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 pe-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={showConfirmPassword ? t('hideConfirmPassword') : t('showConfirmPassword')}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('confirmPasswordHelper')}
                  </p>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('age')} *
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder={t('enterAgePlaceholder')}
                    min="13"
                    max="120"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('location')} *
                  </label>
                  <div className="relative">
                    <MapPin size={20} className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                    <input
                      ref={locationInputRef}
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleLocationChange}
                      onFocus={() => {
                        if (locationSuggestions.length > 0) {
                          setShowLocationSuggestions(true);
                        }
                      }}
                      placeholder={t('cityStateOrAddress')}
                      className="w-full ps-10 pe-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />

                    {/* Autocomplete Suggestions */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div
                        ref={locationSuggestionsRef}
                        className="absolute start-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
                      >
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSuggestionSelect(suggestion)}
                            className={`w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === 0 ? 'rounded-t-xl' : ''
                              } ${index === locationSuggestions.length - 1 ? 'rounded-b-xl' : 'border-b border-gray-100 dark:border-gray-700'
                              }`}
                          >
                            <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {suggestion.displayName}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {isSearchingLocation && (
                      <div className="absolute start-12 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone - Optional, only shown if from phone verification flow */}
                {isFromVerificationFlow && (phoneFromSession || existingUser?.phone) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('phoneNumber')} {existingUser ? '' : '(Optional)'}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center button-center-text"
                  style={{ textAlign: 'center', justifyContent: 'center', display: 'flex' }}
                >
                  {isSubmitting
                    ? (existingUser ? t('updatingProfile') : t('creatingAccount'))
                    : (existingUser ? t('updateProfile') : t('completeRegistration'))}
                </button>
              </form>

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
                    disabled={!isFacebookReady || isFacebookLoading}
                    onClick={handleFacebookLogin}
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

              <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('alreadyHaveAccount') || 'Already have an account?'} <Link to="/login" className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-500">{t('logIn')}</Link>
              </p>
            </>
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
                {t('verificationCodeSent')} <span className="font-semibold text-gray-900 dark:text-white">{verificationContext?.email || formData.email}</span>. {t('checkEmailAndEnter')}
              </p>

              {error && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

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
                    {t('verificationCodeSentTo') || 'Code sent to'} <span className="font-semibold">{verificationContext?.email || formData.email}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verificationCode.join('').length !== 6 || isVerifying}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center button-center-text"
                  style={{ textAlign: 'center', justifyContent: 'center', display: 'flex' }}
                >
                  {isVerifying ? (t('loading') || 'Loading...') : t('verifyCode')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
