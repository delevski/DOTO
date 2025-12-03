import { db } from '../lib/instant';

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
 * Send push notification via Expo Push API
 * @param {string} pushToken - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send with notification
 * @returns {Promise<boolean>} Success status
 */
export async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken) {
    console.log('No push token provided');
    return false;
  }

  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data?.status === 'ok') {
      console.log('Push notification sent successfully');
      return true;
    } else {
      console.error('Failed to send push notification:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send push notification to a user by their user ID
 * Fetches the push token from InstantDB and sends notification
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data (e.g., postId, type)
 * @returns {Promise<boolean>} Success status
 */
export async function sendPushNotificationToUser(userId, title, body, data = {}) {
  if (!userId) {
    console.log('No userId provided');
    return false;
  }

  try {
    const pushToken = await getUserPushToken(userId);

    if (!pushToken) {
      console.log(`No push token found for user ${userId}`);
      return false;
    }

    return await sendPushNotification(pushToken, title, body, data);
  } catch (error) {
    console.error('Error sending push notification to user:', error);
    return false;
  }
}

