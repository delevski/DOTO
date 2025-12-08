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
export function getNotificationMessage(type, language, params = {}) {
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
 * Send localized push notification to a user by their user ID
 * Fetches the push token and language preference from InstantDB
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification (newClaim, claimerApproved, taskMarkedComplete, taskAccepted)
 * @param {object} params - Parameters for the message (userName, postTitle, rating)
 * @param {object} data - Additional data (e.g., postId, type)
 * @returns {Promise<boolean>} Success status
 */
export async function sendPushNotificationToUser(userId, notificationType, params = {}, data = {}) {
  console.log('=== sendPushNotificationToUser START ===');
  console.log('Target userId:', userId);
  console.log('Notification type:', notificationType);
  console.log('Params:', params);
  
  if (!userId) {
    console.log('ERROR: No userId provided');
    return false;
  }

  try {
    // Import here to avoid circular dependencies
    const notificationsModule = await import('./notifications');
    const getUserPushTokenAndLanguage = notificationsModule.getUserPushTokenAndLanguage;
    
    console.log('Fetching push token for user...');
    const userInfo = await getUserPushTokenAndLanguage(userId);
    
    console.log('User info retrieved:', {
      hasToken: !!userInfo?.pushToken,
      tokenPreview: userInfo?.pushToken ? userInfo.pushToken.substring(0, 30) + '...' : 'NONE',
      language: userInfo?.language
    });

    if (!userInfo?.pushToken) {
      console.log(`ERROR: No push token found for user ${userId}`);
      console.log('The user needs to have the app open at least once to register for push notifications');
      return false;
    }

    // Get localized message based on user's language preference
    const { title, body } = getNotificationMessage(
      notificationType, 
      userInfo.language || 'en', 
      params
    );
    
    console.log('Sending notification with:', { title, body });

    const result = await sendPushNotification(userInfo.pushToken, title, body, data);
    console.log('=== sendPushNotificationToUser END ===');
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('ERROR in sendPushNotificationToUser:', error);
    return false;
  }
}

