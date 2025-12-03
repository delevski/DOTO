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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: '5519a148-f81d-466e-8fe0-a3557958c204',
    })).data;
    console.log('Push token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  return token;
}

/**
 * Store push token in user profile
 * @param {string} userId - User ID
 * @param {string} pushToken - Expo push token
 */
export async function savePushTokenToUser(userId, pushToken) {
  if (!userId || !pushToken) {
    console.log('Missing userId or pushToken');
    return;
  }

  try {
    await db.transact(
      db.tx.users[userId].update({
        pushToken: pushToken,
        pushTokenUpdatedAt: Date.now()
      })
    );
    console.log('Push token saved to user profile');
  } catch (error) {
    console.error('Error saving push token:', error);
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
    const { data } = await db.query({
      users: { $: { where: { id: userId } } }
    });
    
    const user = data?.users?.[0];
    return user?.pushToken || null;
  } catch (error) {
    console.error('Error fetching user push token:', error);
    return null;
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

