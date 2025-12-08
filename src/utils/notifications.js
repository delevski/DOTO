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
 * @returns {Promise<string|null>} Push token or null if permission denied
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

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
    return null;
  }

  // Try to get native FCM token first
  try {
    console.log('Trying to get native device token...');
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    console.log('🔔 Native FCM Device Token:', deviceToken.data);
    console.log('🔔 Token Type:', deviceToken.type);
    
    // For standalone builds, we can use FCM token with Expo format
    if (deviceToken && deviceToken.data) {
      // Convert FCM token to Expo format
      token = `ExponentPushToken[${deviceToken.data}]`;
      console.log('Created Expo-style token from FCM:', token.substring(0, 50) + '...');
    }
  } catch (deviceError) {
    console.log('Native token error:', deviceError.message);
  }

  // Also try Expo push token
  if (!token) {
    try {
      console.log('Trying Expo push token...');
      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId: '5519a148-f81d-466e-8fe0-a3557958c204',
      });
      token = expoToken.data;
      console.log('Expo push token:', token);
    } catch (expoError) {
      console.log('Expo token error:', expoError.message);
    }
  }

  console.log('=== Final token:', token ? token.substring(0, 50) + '...' : 'NULL');
  return token;
}

/**
 * Store push token in user profile
 * @param {string} userId - User ID
 * @param {string} pushToken - Expo push token
 * @returns {Promise<boolean>} Success status
 */
export async function savePushTokenToUser(userId, pushToken) {
  console.log('=== savePushTokenToUser ===');
  console.log('User ID:', userId);
  console.log('Push Token:', pushToken ? pushToken.substring(0, 40) + '...' : 'NONE');
  
  if (!userId || !pushToken) {
    console.log('ERROR: Missing userId or pushToken');
    return false;
  }

  try {
    // Try method 1: Direct update with merge
    console.log('Attempting to save push token...');
    
    await db.transact(
      db.tx.users[userId].merge({
        pushToken: pushToken,
        pushTokenUpdatedAt: Date.now()
      })
    );
    
    console.log('Transaction completed, verifying...');
    
    // Wait a moment for the transaction to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the save worked
    const { data: verifyData } = await db.query({ 
      users: { $: { where: { id: userId } } } 
    });
    const verifiedUser = verifyData?.users?.[0];
    const saved = verifiedUser?.pushToken === pushToken;
    
    console.log('Push token save verified:', saved);
    
    if (!saved) {
      console.log('First method failed, trying update...');
      // Try method 2: Regular update
      await db.transact(
        db.tx.users[userId].update({
          pushToken: pushToken,
          pushTokenUpdatedAt: Date.now()
        })
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: verifyData2 } = await db.query({ 
        users: { $: { where: { id: userId } } } 
      });
      const verifiedUser2 = verifyData2?.users?.[0];
      return verifiedUser2?.pushToken === pushToken;
    }
    
    return saved;
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
 * @returns {Promise<{pushToken: string|null, language: string}>} User info
 */
export async function getUserPushTokenAndLanguage(userId) {
  console.log('=== getUserPushTokenAndLanguage ===');
  console.log('Looking for user:', userId);
  
  if (!userId) {
    console.log('ERROR: No userId provided');
    return { pushToken: null, language: 'en' };
  }

  try {
    // Fetch all users and find by ID (InstantDB query pattern)
    console.log('Querying InstantDB for users...');
    const { data } = await db.query({ users: {} });
    
    console.log('Total users in DB:', data?.users?.length || 0);
    
    const user = data?.users?.find(u => u.id === userId);
    
    if (user) {
      console.log('Found user:', {
        id: user.id,
        name: user.name,
        hasPushToken: !!user.pushToken,
        pushTokenPreview: user.pushToken ? user.pushToken.substring(0, 40) + '...' : 'NONE',
        language: user.language || 'en'
      });
    } else {
      console.log('ERROR: User not found in database!');
      console.log('Available user IDs:', data?.users?.map(u => u.id).slice(0, 5));
    }
    
    return {
      pushToken: user?.pushToken || null,
      language: user?.language || 'en'
    };
  } catch (error) {
    console.error('ERROR fetching user info:', error);
    return { pushToken: null, language: 'en' };
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

