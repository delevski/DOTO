const { google } = require('googleapis');

// Path to the service account key JSON file
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  '/Users/corphd/Downloads/doto-1f5d4-firebase-adminsdk-fbsvc-744092c80c.json';

// Your FCM device token (the native FCM token, not Expo token)
const FCM_TOKEN = process.argv[2];

if (!FCM_TOKEN) {
  console.error('❌ Error: Please provide an FCM device token as an argument');
  console.log('   Usage: node send-fcm-notification.js <FCM_DEVICE_TOKEN>');
  process.exit(1);
}

async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  
  const accessToken = await auth.getAccessToken();
  return accessToken;
}

async function sendNotification(deviceToken) {
  console.log('\n🔔 Sending FCM V1 notification...\n');
  
  const accessToken = await getAccessToken();
  
  const message = {
    message: {
      token: deviceToken,
      notification: {
        title: '🎉 Test from DOTO!',
        body: 'Push notifications are working! Tap to open the app.',
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    },
  };

  try {
    const response = await fetch(
      'https://fcm.googleapis.com/v1/projects/doto-1f5d4/messages:send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Notification sent!');
      console.log('📬 Message ID:', result.name);
      console.log('\n   Check your device for the notification! 📱\n');
    } else {
      console.error('❌ FAILED to send notification:');
      console.error(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendNotification(FCM_TOKEN);

