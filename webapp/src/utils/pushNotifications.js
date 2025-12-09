import { db } from '../lib/instant';

// Notification message translations
const notificationMessages = {
  en: {
    newClaim: {
      title: 'New Claim!',
      body: (userName, postTitle) => `${userName} wants to help with "${postTitle}"`,
    },
    claimerApproved: {
      title: "You're Approved!",
      body: (postTitle) => `You were approved to help with "${postTitle}"`,
    },
    taskMarkedComplete: {
      title: 'Task Completed!',
      body: (postTitle) => `The helper has finished "${postTitle}". Please confirm and rate.`,
    },
    taskAccepted: {
      title: 'Great Job!',
      body: (postTitle, rating) => `Task "${postTitle}" is done! You received ${rating} stars.`,
    },
    newMessage: {
      title: 'New Message!',
      body: (userName) => `${userName} sent you a message`,
    },
    postLiked: {
      title: 'Someone Liked Your Post!',
      body: (userName, postTitle) => `${userName} liked "${postTitle}"`,
    },
    newComment: {
      title: 'New Comment!',
      body: (userName, postTitle) => `${userName} commented on "${postTitle}"`,
    },
    newRating: {
      title: 'You Got Rated!',
      body: (userName, rating) => `${userName} gave you ${rating} stars!`,
    },
  },
  he: {
    newClaim: {
      title: 'בקשה חדשה!',
      body: (userName, postTitle) => `${userName} רוצה לעזור עם "${postTitle}"`,
    },
    claimerApproved: {
      title: 'אושרת!',
      body: (postTitle) => `אושרת לעזור עם "${postTitle}"`,
    },
    taskMarkedComplete: {
      title: 'המשימה הושלמה!',
      body: (postTitle) => `העוזר סיים את "${postTitle}". אנא אשר ודרג.`,
    },
    taskAccepted: {
      title: 'עבודה מצוינת!',
      body: (postTitle, rating) => `המשימה "${postTitle}" הושלמה! קיבלת ${rating} כוכבים.`,
    },
    newMessage: {
      title: 'הודעה חדשה!',
      body: (userName) => `${userName} שלח/ה לך הודעה`,
    },
    postLiked: {
      title: 'מישהו אהב את הפוסט שלך!',
      body: (userName, postTitle) => `${userName} אהב/ה את "${postTitle}"`,
    },
    newComment: {
      title: 'תגובה חדשה!',
      body: (userName, postTitle) => `${userName} הגיב/ה על "${postTitle}"`,
    },
    newRating: {
      title: 'קיבלת דירוג!',
      body: (userName, rating) => `${userName} נתן/ה לך ${rating} כוכבים!`,
    },
  },
};

/**
 * Get notification message based on type and language
 * @param {string} type - Notification type (newClaim, claimerApproved, etc.)
 * @param {string} language - User's language preference (en/he)
 * @param {object} params - Parameters for the message (userName, postTitle, rating)
 * @returns {object} { title, body }
 */
function getNotificationMessage(type, language, params = {}) {
  const lang = language === 'he' ? 'he' : 'en';
  const messages = notificationMessages[lang];
  
  if (!messages[type]) {
    return { title: 'DOTO', body: 'You have a new notification' };
  }
  
  const { userName, postTitle, rating } = params;
  const messageConfig = messages[type];
  
  return {
    title: messageConfig.title,
    body: messageConfig.body(userName || postTitle, postTitle || rating, rating),
  };
}

/**
 * Get push token and language preference for a user from InstantDB
 * @param {string} userId - User ID
 * @returns {Promise<{pushToken: string|null, fcmToken: string|null, language: string}>} User info
 */
async function getUserPushTokenAndLanguage(userId) {
  console.log('🔔 getUserPushTokenAndLanguage called for userId:', userId);
  if (!userId) return { pushToken: null, fcmToken: null, language: 'en' };

  try {
    // Query all users from InstantDB (use queryOnce for one-time queries outside React components)
    console.log('🔔 Calling db.queryOnce for users...');
    const { data } = await db.queryOnce({ users: {} });
    
    console.log('🔔 Query result received, users count:', data?.users?.length || 0);
    
    const user = data?.users?.find(u => u.id === userId);
    
    if (user) {
      console.log('🔔 Found user:', { 
        id: user.id,
        name: user.name,
        hasPushToken: !!user.pushToken,
        hasFcmToken: !!user.fcmToken,
        pushTokenPreview: user.pushToken?.substring(0, 40),
        fcmTokenPreview: user.fcmToken?.substring(0, 40),
        language: user.language
      });
    } else {
      console.log('🔔 User NOT found! Available IDs:', data?.users?.map(u => u.id).slice(0, 5));
    }
    
    return {
      pushToken: user?.pushToken || null,
      fcmToken: user?.fcmToken || null,
      language: user?.language || 'en'
    };
  } catch (error) {
    console.error('🔔 Error fetching user info:', error);
    console.error('🔔 Error name:', error.name);
    console.error('🔔 Error message:', error.message);
    console.error('🔔 Error stack:', error.stack);
    return { pushToken: null, fcmToken: null, language: 'en' };
  }
}

/**
 * Send push notification via smart proxy (auto-detects Expo vs FCM)
 * @param {string} token - Push token (Expo format or raw FCM token)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send with notification
 * @returns {Promise<boolean>} Success status
 */
async function sendPushNotification(token, title, body, data = {}) {
  if (!token) {
    console.log('🔔 No token provided');
    return false;
  }

  const isExpoToken = token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  console.log('🔔 Token type:', isExpoToken ? 'Expo' : 'FCM (raw)');
  console.log('🔔 Token preview:', token.substring(0, 60) + '...');

  // Use the smart proxy endpoint which auto-detects token type
  const proxyUrl = import.meta.env.VITE_PUSH_PROXY_URL || 'http://localhost:3002';
  const smartEndpoint = `${proxyUrl}/api/smart/send`;
  
  console.log('🔔 Using smart proxy:', smartEndpoint);

  try {
    const payload = {
      token: token,
      title: title,
      body: body,
      data: data,
    };

    console.log('🔔 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(smartEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('🔔 Proxy response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('🔔 ❌ Proxy error:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('🔔 Proxy result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`🔔 ✅ Push sent via ${result.provider}!`);
      return true;
    } else {
      console.error('🔔 ❌ Push failed:', result.error);
      
      // Check for specific errors
      if (result.result?.data?.details?.error === 'DeviceNotRegistered') {
        console.log('🔔 ℹ️ Device not registered - token may be invalid or expired');
        console.log('🔔 ℹ️ User needs to open mobile app and re-register');
      }
      
      return false;
    }
  } catch (error) {
    console.error('🔔 ❌ Error sending push notification:', error);
    console.log('🔔 ⚠️ Make sure proxy server is running: cd webapp && npm run proxy');
    return false;
  }
}

/**
 * Send localized push notification to a user by their user ID
 * Fetches the push token and language preference from InstantDB
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification (newClaim, claimerApproved, taskMarkedComplete, taskAccepted)
 * @param {object} params - Parameters for the message (userName, postTitle, rating)
 * @param {object} data - Additional data (e.g., postId, type)
 * @returns {Promise<boolean>} Success status
 */
export async function sendPushNotificationToUser(userId, notificationType, params = {}, data = {}) {
  console.log('🔔 ====== sendPushNotificationToUser START ======');
  console.log('🔔 Input:', { userId, notificationType, params, data });
  
  if (!userId) {
    console.log('🔔 ❌ No userId provided');
    return false;
  }

  try {
    const userInfo = await getUserPushTokenAndLanguage(userId);
    console.log('🔔 User info fetched:', { 
      hasPushToken: !!userInfo?.pushToken, 
      hasFcmToken: !!userInfo?.fcmToken,
      pushTokenType: userInfo?.pushToken ? (userInfo.pushToken.startsWith('ExponentPushToken') ? 'Expo' : 'Other') : 'none',
      fcmTokenType: userInfo?.fcmToken ? 'FCM' : 'none',
      language: userInfo?.language 
    });

    // Get token (prefer fcmToken, fallback to pushToken)
    // Try both tokens - Expo format can work with either
    const token = userInfo?.fcmToken || userInfo?.pushToken;
    
    if (!token) {
      console.log(`🔔 ❌ No push token found for user ${userId}`);
      console.log('🔔 User needs to open mobile app Settings and tap "Test Notifications"');
      console.log('🔔 Debug: User object keys:', userInfo ? Object.keys(userInfo) : 'no userInfo');
      return false;
    }
    
    console.log('🔔 Using token:', token.substring(0, 60) + '...');

    // Get localized message based on user's language preference
    const { title, body } = getNotificationMessage(
      notificationType, 
      userInfo.language || 'en', 
      params
    );
    console.log('🔔 Notification content:', { title, body });

    // Send via Expo Push API (handles FCM under the hood)
    const success = await sendPushNotification(token, title, body, data);

    console.log('🔔 ====== Final result:', success ? '✅ SUCCESS' : '❌ FAILED', '======');
    return success;
  } catch (error) {
    console.error('🔔 ❌ Error sending push notification to user:', error);
    return false;
  }
}

