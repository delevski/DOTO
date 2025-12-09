import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../lib/instant';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and register push token
 * @returns {Promise<{token: string|null, fcmToken: string|null}>} Push tokens or null if permission denied
 */
export async function registerForPushNotificationsAsync() {
  let token = null;
  let fcmToken = null;

  console.log('=== registerForPushNotificationsAsync START ===');
  console.log('Platform:', Platform.OS);

  if (Platform.OS === 'android') {
    console.log('Setting up Android notification channel...');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
    });
    console.log('Android channel created');
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('Existing permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    console.log('Requesting permission...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('New permission status:', finalStatus);
  }

  if (finalStatus !== 'granted') {
    console.log('Permission NOT granted!');
    return { token: null, fcmToken: null };
  }

  // Step 1: Get native FCM token
  try {
    console.log('Getting native FCM device token...');
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    fcmToken = deviceToken?.data || null;
    console.log('🔔 Native FCM Token:', fcmToken ? fcmToken.substring(0, 50) + '...' : 'FAILED');
  } catch (deviceError) {
    console.log('Native FCM token error:', deviceError.message);
  }

  // Step 2: Try to get Expo push token (may fail for standalone builds without EAS)
  try {
    console.log('Getting Expo push token...');
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: '5519a148-f81d-466e-8fe0-a3557958c204',
    });
    token = expoPushToken?.data || null;
    console.log('🔔 Expo Push Token:', token ? token.substring(0, 50) + '...' : 'FAILED');
  } catch (expoError) {
    console.log('Expo token error (expected for standalone):', expoError.message);
    // For standalone builds, just use the raw FCM token
    // The push notification sender will detect this and use FCM directly
    if (fcmToken) {
      token = fcmToken;  // Use raw FCM token, NOT wrapped
      console.log('🔔 Using raw FCM token for standalone build');
    }
  }

  console.log('=== Final tokens:', { 
    hasToken: !!token, 
    hasFcmToken: !!fcmToken 
  });
  
  return { token, fcmToken };
}

/**
 * Store push token in user profile
 * @param {string} userId - User ID
 * @param {string} pushToken - Expo push token
 * @param {string} fcmToken - Native FCM token (optional)
 * @returns {Promise<boolean>} Success status
 */
export async function savePushTokenToUser(userId, pushToken, fcmToken = null) {
  console.log('=== savePushTokenToUser ===');
  console.log('User ID:', userId);
  console.log('Push Token:', pushToken ? pushToken.substring(0, 40) + '...' : 'NONE');
  console.log('FCM Token:', fcmToken ? fcmToken.substring(0, 40) + '...' : 'NONE');
  
  if (!userId) {
    console.log('ERROR: Missing userId');
    return false;
  }

  if (!pushToken && !fcmToken) {
    console.log('ERROR: Missing both pushToken and fcmToken');
    return false;
  }

  try {
    // Save both tokens
    const updateData = {
      pushTokenUpdatedAt: Date.now()
    };
    
    if (pushToken) {
      updateData.pushToken = pushToken;
    }
    if (fcmToken) {
      updateData.fcmToken = fcmToken;
    }
    
    console.log('Saving tokens to DB:', Object.keys(updateData));
    
    await db.transact(
      db.tx.users[userId].merge(updateData)
    );
    
    console.log('Transaction completed, verifying...');
    
    // Wait a moment for the transaction to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the save worked
    const { data: verifyData } = await db.query({ 
      users: { $: { where: { id: userId } } } 
    });
    const verifiedUser = verifyData?.users?.[0];
    
    console.log('Verification result:', {
      hasPushToken: !!verifiedUser?.pushToken,
      hasFcmToken: !!verifiedUser?.fcmToken
    });
    
    return !!(verifiedUser?.pushToken || verifiedUser?.fcmToken);
  } catch (error) {
    console.error('ERROR saving push token:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

/**
 * Get push token for a user from InstantDB
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Push token or null
 */
export async function getUserPushToken(userId) {
  if (!userId) return null;

  try {
    // Fetch all users and find by ID (InstantDB query pattern)
    const { data } = await db.query({ users: {} });
    const user = data?.users?.find(u => u.id === userId);
    
    console.log(`[Push] Looking for push token for user ${userId}:`, user?.pushToken ? 'Found' : 'Not found');
    return user?.pushToken || null;
  } catch (error) {
    console.error('Error fetching user push token:', error);
    return null;
  }
}

/**
 * Get push token and language preference for a user from InstantDB
 * @param {string} userId - User ID
 * @returns {Promise<{pushToken: string|null, fcmToken: string|null, language: string}>} User info
 */
export async function getUserPushTokenAndLanguage(userId) {
  console.log('🔔 === getUserPushTokenAndLanguage ===');
  console.log('🔔 Looking for user:', userId);
  
  if (!userId) {
    console.log('🔔 ERROR: No userId provided');
    return { pushToken: null, fcmToken: null, language: 'en' };
  }

  try {
    // Fetch all users and find by ID (InstantDB query pattern)
    console.log('🔔 Querying InstantDB for users...');
    const { data } = await db.query({ users: {} });
    
    console.log('🔔 Total users in DB:', data?.users?.length || 0);
    
    const user = data?.users?.find(u => u.id === userId);
    
    if (user) {
      console.log('🔔 Found user:', {
        id: user.id,
        name: user.name,
        hasPushToken: !!user.pushToken,
        hasFcmToken: !!user.fcmToken,
        pushTokenPreview: user.pushToken ? user.pushToken.substring(0, 40) + '...' : 'NONE',
        fcmTokenPreview: user.fcmToken ? user.fcmToken.substring(0, 40) + '...' : 'NONE',
        language: user.language || 'en'
      });
    } else {
      console.log('🔔 ERROR: User not found in database!');
      console.log('🔔 Available user IDs:', data?.users?.map(u => u.id).slice(0, 5));
    }
    
    return {
      pushToken: user?.pushToken || null,
      fcmToken: user?.fcmToken || null,
      language: user?.language || 'en'
    };
  } catch (error) {
    console.error('🔔 ERROR fetching user info:', error);
    return { pushToken: null, fcmToken: null, language: 'en' };
  }
}

/**
 * Save user's language preference to InstantDB
 * @param {string} userId - User ID
 * @param {string} language - Language code (en/he)
 */
export async function saveUserLanguage(userId, language) {
  if (!userId || !language) return;

  try {
    await db.transact(
      db.tx.users[userId].update({
        language: language,
        languageUpdatedAt: Date.now()
      })
    );
    console.log('User language saved:', language);
  } catch (error) {
    console.error('Error saving user language:', error);
  }
}

/**
 * Set up notification listeners
 * @param {Function} onNotificationReceived - Callback when notification is received
 * @param {Function} onNotificationTapped - Callback when notification is tapped
 * @returns {Array} Array of subscription objects to unsubscribe
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
  // Listener for notifications received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  return [receivedSubscription, responseSubscription];
}

