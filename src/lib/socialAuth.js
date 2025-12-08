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

// OAuth Configuration from app.json extra
const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID_IOS = Constants.expoConfig?.extra?.googleClientIdIos || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const GOOGLE_CLIENT_ID_ANDROID = Constants.expoConfig?.extra?.googleClientIdAndroid || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
const FACEBOOK_APP_ID = Constants.expoConfig?.extra?.facebookAppId || 
                        Constants.expoConfig?.facebookAppId || 
                        process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

// Get the appropriate Google client ID based on platform
function getGoogleClientId() {
  if (Platform.OS === 'ios') {
    return GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID;
  }
  if (Platform.OS === 'android') {
    return GOOGLE_CLIENT_ID_ANDROID || GOOGLE_CLIENT_ID;
  }
  return GOOGLE_CLIENT_ID; // Web
}

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
 */
export function useGoogleAuth() {
  const clientId = getGoogleClientId();
  const redirectUri = getRedirectUri('google');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/contacts.readonly',
      ],
      responseType: AuthSession.ResponseType.Token,
    },
    googleDiscovery
  );

  return { request, response, promptAsync, redirectUri };
}

/**
 * Native Facebook Login using react-native-fbsdk-next
 * This will use the Facebook app if installed, otherwise falls back to web
 */
export async function loginWithFacebookNative() {
  try {
    // Log out first to ensure clean state
    LoginManager.logOut();
    
    // Request login with permissions
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
    
    if (result.isCancelled) {
      console.log('Facebook login cancelled');
      return { type: 'cancel', error: null };
    }
    
    // Get access token
    const accessToken = await AccessToken.getCurrentAccessToken();
    
    if (!accessToken) {
      throw new Error('Failed to get Facebook access token');
    }
    
    console.log('Facebook login successful, token:', accessToken.accessToken.substring(0, 20) + '...');
    
    return {
      type: 'success',
      accessToken: accessToken.accessToken,
      userID: accessToken.userID,
    };
  } catch (error) {
    console.error('Facebook native login error:', error);
    return { type: 'error', error: error.message };
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
 */
export function isGoogleConfigured() {
  const clientId = getGoogleClientId();
  return clientId && !clientId.includes('{YOUR_');
}

export function isFacebookConfigured() {
  const appId = FACEBOOK_APP_ID || Constants.expoConfig?.facebookAppId;
  return appId && !appId.includes('{YOUR_') && appId.length > 0;
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

