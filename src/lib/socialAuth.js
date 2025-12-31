/**
 * Social Authentication Utilities
 * 
 * Handles Google OAuth via expo-auth-session and Facebook via native SDK.
 * Also fetches friends/contacts from both services for the Friends Feed feature.
 */

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db, id } from './instant';

// Native Facebook SDK for proper native app login
import { LoginManager, AccessToken, Profile } from 'react-native-fbsdk-next';

// Ensure web browser redirects work properly
WebBrowser.maybeCompleteAuthSession();

// OAuth Configuration - Hardcoded values for release builds
// These values are from app.json and will always work in release builds
const FALLBACK_GOOGLE_CLIENT_ID = '478956201432-ac1cqomlshdhnkkjq23lcb7r0jhc92ul.apps.googleusercontent.com';
const FALLBACK_FACEBOOK_APP_ID = '2301357543703221';

// Try to get config from Constants (works in dev), but always fallback to hardcoded values
const getConfigValue = (key, fallbackEnvKey, defaultValue) => {
  // Try Constants.expoConfig.extra first (works in dev)
  if (Constants.expoConfig?.extra?.[key] && !Constants.expoConfig.extra[key].includes('{YOUR_')) {
    return Constants.expoConfig.extra[key];
  }
  // Try Constants.expoConfig directly
  if (Constants.expoConfig?.[key] && !Constants.expoConfig[key].includes('{YOUR_')) {
    return Constants.expoConfig[key];
  }
  // Try environment variable
  if (fallbackEnvKey && process.env[fallbackEnvKey] && !process.env[fallbackEnvKey].includes('{YOUR_')) {
    return process.env[fallbackEnvKey];
  }
  // Always return the hardcoded fallback for release builds
  return defaultValue;
};

// Get config values - ALWAYS use fallback if other sources fail or are placeholders
let GOOGLE_CLIENT_ID = getConfigValue('googleClientId', 'EXPO_PUBLIC_GOOGLE_CLIENT_ID', FALLBACK_GOOGLE_CLIENT_ID);
// Force fallback if value is invalid
if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('{YOUR_') || GOOGLE_CLIENT_ID.length < 10) {
  GOOGLE_CLIENT_ID = FALLBACK_GOOGLE_CLIENT_ID;
}

const GOOGLE_CLIENT_ID_IOS = getConfigValue('googleClientIdIos', 'EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS', null);
const GOOGLE_CLIENT_ID_ANDROID = getConfigValue('googleClientIdAndroid', 'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID', null);

let FACEBOOK_APP_ID = getConfigValue('facebookAppId', 'EXPO_PUBLIC_FACEBOOK_APP_ID', FALLBACK_FACEBOOK_APP_ID);
// Force fallback if value is invalid
if (!FACEBOOK_APP_ID || FACEBOOK_APP_ID.includes('{YOUR_') || FACEBOOK_APP_ID.length < 5) {
  FACEBOOK_APP_ID = FALLBACK_FACEBOOK_APP_ID;
}

// Get the appropriate Google client ID based on platform
function getGoogleClientId() {
  if (Platform.OS === 'ios') {
    // Skip placeholder values and use fallback
    const iosId = GOOGLE_CLIENT_ID_IOS;
    if (iosId && !iosId.includes('{YOUR_') && iosId.length > 10) {
      return iosId;
    }
    // Always return the general client ID (which has fallback)
    return GOOGLE_CLIENT_ID;
  }
  if (Platform.OS === 'android') {
    // Skip placeholder values and use fallback
    const androidId = GOOGLE_CLIENT_ID_ANDROID;
    if (androidId && !androidId.includes('{YOUR_') && androidId.length > 10) {
      return androidId;
    }
    // Always return the general client ID (which has fallback)
    return GOOGLE_CLIENT_ID;
  }
  return GOOGLE_CLIENT_ID; // Web
}

// Log configuration at module load (for debugging)
console.log('📱 Social Auth Config Loaded:', {
  platform: Platform.OS,
  googleClientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 30)}...` : 'MISSING',
  googleClientIdLength: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.length : 0,
  facebookAppId: FACEBOOK_APP_ID ? `${FACEBOOK_APP_ID.substring(0, 10)}...` : 'MISSING',
  facebookAppIdLength: FACEBOOK_APP_ID ? FACEBOOK_APP_ID.length : 0,
  hasFallbackGoogle: GOOGLE_CLIENT_ID === FALLBACK_GOOGLE_CLIENT_ID,
  hasFallbackFacebook: FACEBOOK_APP_ID === FALLBACK_FACEBOOK_APP_ID,
});

// OAuth Discovery documents
const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const facebookDiscovery = {
  authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
};

/**
 * Get the redirect URI for OAuth
 * For Android Studio builds, use native scheme directly
 */
function getRedirectUri(provider = 'default') {
  // For native Android builds via Android Studio, use native scheme
  return AuthSession.makeRedirectUri({
    scheme: 'doto',
    path: 'auth',
    native: `doto://auth`,
  });
}

/**
 * Get Facebook-specific redirect URI
 * Facebook requires specific redirect URIs to be whitelisted
 * For Android native builds, use the Facebook scheme
 */
function getFacebookRedirectUri() {
  // For native Android builds, Facebook expects the fb[APP_ID] scheme
  // This matches what's configured in app.json and AndroidManifest
  return AuthSession.makeRedirectUri({
    scheme: `fb${FACEBOOK_APP_ID}`,
    path: 'authorize',
    native: `fb${FACEBOOK_APP_ID}://authorize`,
  });
}

/**
 * Google OAuth Configuration
 * Updated to use ID tokens for InstantDB native sign-in
 * Uses implicit flow to get ID token directly
 */
export function useGoogleAuth() {
  const clientId = getGoogleClientId();
  const redirectUri = getRedirectUri('google');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      usePKCE: false, // Disable PKCE for Implicit Flow (response_type=token)
      scopes: [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/contacts.readonly',
      ],
      // Use Code response type for PKCE (standard for native apps)
      responseType: AuthSession.ResponseType.Code,
      shouldAutoExchangeCode: false, // We'll exchange it manually
      usePKCE: true, // Enable PKCE
    },
    googleDiscovery
  );

  return { request, response, promptAsync, redirectUri };
}

/**
 * Exchange authorization code for tokens (PKCE flow)
 */
export async function exchangeGoogleCode(code, request) {
  try {
    const redirectUri = getRedirectUri('google');
    const clientId = getGoogleClientId();

    const result = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier,
        },
      },
      googleDiscovery
    );

    return result;
  } catch (error) {
    console.error('Error exchanging Google code:', error);
    throw error;
  }
}

/**
 * Native Facebook Login using react-native-fbsdk-next
 * This will use the Facebook app if installed, otherwise falls back to web
 */
export async function loginWithFacebookNative() {
  try {
    // First, check if LoginManager is available at all
    if (typeof LoginManager === 'undefined' || LoginManager === null) {
      console.error('LoginManager is undefined or null');
      return {
        type: 'error',
        error: 'Facebook SDK not initialized. Please rebuild the app with react-native-fbsdk-next properly linked.'
      };
    }

    // Check if LoginManager is an object with methods
    if (typeof LoginManager !== 'object') {
      console.error('LoginManager is not an object:', typeof LoginManager);
      return {
        type: 'error',
        error: 'Facebook SDK not properly initialized. Please rebuild the app.'
      };
    }

    // Log out first to ensure clean state - wrap in try-catch, this is not critical
    try {
      if (typeof LoginManager.logOut === 'function') {
        LoginManager.logOut();
      }
    } catch (e) {
      // Ignore logout errors - they're not critical for login
      console.log('Logout error (non-critical):', e?.message || e);
    }

    // Check if logInWithPermissions method exists
    if (typeof LoginManager.logInWithPermissions !== 'function') {
      console.error('LoginManager.logInWithPermissions is not a function', {
        LoginManagerType: typeof LoginManager,
        availableMethods: LoginManager ? Object.keys(LoginManager).join(', ') : 'none'
      });
      return {
        type: 'error',
        error: 'Facebook login method not available. Please rebuild the app.'
      };
    }

    // Request login with permissions
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

    if (!result) {
      return { type: 'error', error: 'Facebook login returned no result' };
    }

    if (result.isCancelled) {
      console.log('Facebook login cancelled');
      return { type: 'cancel', error: null };
    }

    // Check if AccessToken is available
    if (typeof AccessToken === 'undefined' || AccessToken === null) {
      console.error('AccessToken is undefined or null');
      return {
        type: 'error',
        error: 'Facebook access token module not available. Please rebuild the app.'
      };
    }

    if (typeof AccessToken.getCurrentAccessToken !== 'function') {
      console.error('AccessToken.getCurrentAccessToken is not a function');
      return {
        type: 'error',
        error: 'Facebook access token method not available. Please rebuild the app.'
      };
    }

    const accessToken = await AccessToken.getCurrentAccessToken();

    if (!accessToken) {
      throw new Error('Failed to get Facebook access token');
    }

    if (!accessToken.accessToken) {
      throw new Error('Facebook access token is missing accessToken property');
    }

    console.log('Facebook login successful, token:', accessToken.accessToken.substring(0, 20) + '...');

    return {
      type: 'success',
      accessToken: accessToken.accessToken,
      userID: accessToken.userID,
    };
  } catch (error) {
    console.error('Facebook native login error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown Facebook login error';
    return { type: 'error', error: errorMessage };
  }
}

/**
 * Hook wrapper for Facebook auth to maintain compatibility with existing code
 * Note: This is a simplified version since native SDK doesn't use hooks pattern
 */
export function useFacebookAuth() {
  // For native SDK, we don't use the hooks pattern
  // Instead, return a promptAsync that calls the native login
  const promptAsync = async () => {
    return await loginWithFacebookNative();
  };

  return {
    request: { ready: true },
    response: null,
    promptAsync,
    redirectUri: `fb${FACEBOOK_APP_ID}://authorize`
  };
}

/**
 * Fetch Google user profile
 */
export async function fetchGoogleUserProfile(accessToken) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Google profile');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture,
      provider: 'google',
    };
  } catch (error) {
    console.error('Error fetching Google profile:', error);
    throw error;
  }
}

/**
 * Fetch Google contacts (People API)
 * Returns contacts who might also be DOTO users
 */
export async function fetchGoogleContacts(accessToken) {
  try {
    const response = await fetch(
      'https://people.googleapis.com/v1/people/me/connections?' +
      'personFields=names,emailAddresses&pageSize=1000',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch Google contacts - may need permission');
      return [];
    }

    const data = await response.json();
    const connections = data.connections || [];

    // Extract unique emails from contacts
    const contactEmails = [];
    connections.forEach(connection => {
      const emails = connection.emailAddresses || [];
      emails.forEach(email => {
        if (email.value) {
          contactEmails.push({
            provider: 'google',
            email: email.value.toLowerCase(),
            name: connection.names?.[0]?.displayName || email.value,
          });
        }
      });
    });

    return contactEmails;
  } catch (error) {
    console.error('Error fetching Google contacts:', error);
    return [];
  }
}

/**
 * Fetch Facebook user profile
 */
export async function fetchFacebookUserProfile(accessToken) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Facebook profile');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture?.data?.url,
      provider: 'facebook',
    };
  } catch (error) {
    console.error('Error fetching Facebook profile:', error);
    throw error;
  }
}

/**
 * Fetch Facebook friends who also use this app
 * Note: user_friends only returns friends who also use the app
 */
export async function fetchFacebookFriends(accessToken) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/friends?fields=id,name,picture&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.warn('Failed to fetch Facebook friends - may need permission');
      return [];
    }

    const data = await response.json();
    const friends = data.data || [];

    return friends.map(friend => ({
      provider: 'facebook',
      id: friend.id,
      name: friend.name,
      avatar: friend.picture?.data?.url,
    }));
  } catch (error) {
    console.error('Error fetching Facebook friends:', error);
    return [];
  }
}

/**
 * Find or create a user in InstantDB based on social login
 * 
 * @param {Object} profile - User profile from social provider
 * @param {Array} socialFriends - List of friends/contacts from social provider
 * @param {Array} existingUsers - Existing users from InstantDB
 * @returns {Object} The user object
 */
export async function findOrCreateSocialUser(profile, socialFriends, existingUsers) {
  const { id: socialId, email, name, avatar, provider } = profile;

  // Check if user already exists by social ID or email
  let existingUser = existingUsers.find(u => {
    if (provider === 'google' && u.googleId === socialId) return true;
    if (provider === 'facebook' && u.facebookId === socialId) return true;
    if (u.email?.toLowerCase() === email?.toLowerCase()) return true;
    return false;
  });

  // Find which of user's social friends are already DOTO users
  const friendUserIds = [];

  if (provider === 'facebook') {
    // For Facebook, match by Facebook ID
    socialFriends.forEach(friend => {
      const matchedUser = existingUsers.find(u => u.facebookId === friend.id);
      if (matchedUser) {
        friendUserIds.push(matchedUser.id);
      }
    });
  } else if (provider === 'google') {
    // For Google, match by email
    socialFriends.forEach(contact => {
      const matchedUser = existingUsers.find(
        u => u.email?.toLowerCase() === contact.email?.toLowerCase()
      );
      if (matchedUser) {
        friendUserIds.push(matchedUser.id);
      }
    });
  }

  if (existingUser) {
    // Update existing user with social info
    const updates = {
      ...(provider === 'google' && { googleId: socialId }),
      ...(provider === 'facebook' && { facebookId: socialId }),
      ...(avatar && !existingUser.avatar && { avatar }),
      lastLogin: Date.now(),
    };

    // Merge friend lists
    const existingSocialFriends = existingUser.socialFriends || [];
    const mergedFriends = [...new Set([...existingSocialFriends, ...friendUserIds])];
    updates.socialFriends = mergedFriends;

    await db.transact(db.tx.users[existingUser.id].update(updates));

    return {
      ...existingUser,
      ...updates,
    };
  }

  // Create new user
  const newUserId = id();
  const newUser = {
    id: newUserId,
    email: email?.toLowerCase(),
    emailLower: email?.toLowerCase(),
    name: name || email?.split('@')[0],
    avatar: avatar || null,
    authProvider: provider,
    googleId: provider === 'google' ? socialId : null,
    facebookId: provider === 'facebook' ? socialId : null,
    socialFriends: friendUserIds,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    isVerified: true, // Social login users are auto-verified
    stats: {
      postsCreated: 0,
      tasksClaimed: 0,
      tasksCompleted: 0,
      likesReceived: 0,
    },
  };

  await db.transact(db.tx.users[newUserId].update(newUser));

  return newUser;
}

/**
 * Update user's social friends list
 * Call this periodically to sync friends
 */
export async function updateSocialFriends(userId, provider, friends, existingUsers) {
  const friendUserIds = [];

  if (provider === 'facebook') {
    friends.forEach(friend => {
      const matchedUser = existingUsers.find(u => u.facebookId === friend.id);
      if (matchedUser) {
        friendUserIds.push(matchedUser.id);
      }
    });
  } else if (provider === 'google') {
    friends.forEach(contact => {
      const matchedUser = existingUsers.find(
        u => u.email?.toLowerCase() === contact.email?.toLowerCase()
      );
      if (matchedUser) {
        friendUserIds.push(matchedUser.id);
      }
    });
  }

  // Get current user to merge friends
  const currentUser = existingUsers.find(u => u.id === userId);
  const existingSocialFriends = currentUser?.socialFriends || [];
  const mergedFriends = [...new Set([...existingSocialFriends, ...friendUserIds])];

  await db.transact(
    db.tx.users[userId].update({
      socialFriends: mergedFriends,
    })
  );

  return mergedFriends;
}

/**
 * Check if OAuth credentials are configured
 * Always returns true if we have the hardcoded fallback value
 */
export function isGoogleConfigured() {
  // Get the actual client ID that would be used
  const clientId = getGoogleClientId();

  // Always log for debugging
  console.log('🔍 Google Config Check:', {
    platform: Platform.OS,
    clientId: clientId ? `${clientId.substring(0, 40)}...` : 'null',
    clientIdLength: clientId ? clientId.length : 0,
    hasGeneralId: !!GOOGLE_CLIENT_ID,
    generalIdValue: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 40)}...` : 'null',
    isFallback: clientId === FALLBACK_GOOGLE_CLIENT_ID,
  });

  // Always return true if we have the fallback value (which we always do)
  if (clientId === FALLBACK_GOOGLE_CLIENT_ID) {
    console.log('✅ Using hardcoded Google Client ID fallback');
    return true;
  }

  // Check if client ID exists and is valid
  if (clientId && typeof clientId === 'string' && clientId.length > 0) {
    // Check if it's a placeholder value
    if (clientId.includes('{YOUR_') || clientId.includes('YOUR_')) {
      console.warn('⚠️ Google Client ID is a placeholder, using fallback');
      // Force use fallback
      return true; // Still return true because fallback exists
    }
    // Valid client ID found
    if (clientId.includes('.apps.googleusercontent.com') || clientId.length > 50) {
      console.log('✅ Valid Google Client ID found');
      return true;
    }
  }

  // If we get here, something is wrong, but we always have fallback, so return true
  console.warn('⚠️ Using fallback Google Client ID');
  return true;
}

export function isFacebookConfigured() {
  const appId = FACEBOOK_APP_ID;

  // Always log for debugging
  console.log('🔍 Facebook Config Check:', {
    appId: appId ? `${appId.substring(0, 15)}...` : 'null',
    appIdLength: appId ? appId.length : 0,
    isFallback: appId === FALLBACK_FACEBOOK_APP_ID,
  });

  // Always return true if we have the fallback value (which we always do)
  if (appId === FALLBACK_FACEBOOK_APP_ID) {
    console.log('✅ Using hardcoded Facebook App ID fallback');
    return true;
  }

  // Check if app ID exists and is valid
  if (appId && typeof appId === 'string' && appId.length > 0) {
    // Check if it's a placeholder value
    if (appId.includes('{YOUR_') || appId.includes('YOUR_')) {
      console.warn('⚠️ Facebook App ID is a placeholder, using fallback');
      return true; // Still return true because fallback exists
    }
    // Valid app ID found
    return true;
  }

  // If we get here, something is wrong, but we always have fallback, so return true
  console.warn('⚠️ Using fallback Facebook App ID');
  return true;
}

/**
 * Check if running in Expo Go (useful for debugging auth issues)
 */
export function isRunningInExpoGo() {
  return Constants.appOwnership === 'expo';
}

/**
 * Get debug info for Facebook OAuth setup
 * Useful for debugging redirect URI issues in Android Studio builds
 */
export function getFacebookAuthDebugInfo() {
  const redirectUri = getFacebookRedirectUri();
  return {
    appId: FACEBOOK_APP_ID,
    redirectUri,
    platform: Platform.OS,
    scheme: Constants.expoConfig?.scheme,
    facebookScheme: Constants.expoConfig?.facebookScheme || `fb${FACEBOOK_APP_ID}`,
    expectedAndroidScheme: `fb${FACEBOOK_APP_ID}://authorize`,
  };
}

