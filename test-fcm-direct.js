const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('/Users/corphd/Downloads/doto-1f5d4-firebase-adminsdk-fbsvc-744092c80c.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'doto-1f5d4'
});

// This is the Expo Push Token (we need the native FCM token from the device)
// The Expo Push Token format is: ExponentPushToken[xxx]
// For direct FCM, we need the native device token

// Get the FCM token as argument or use a placeholder
const expoPushToken = process.argv[2];

if (!expoPushToken) {
  console.log('❌ Please provide the Expo Push Token as an argument');
  console.log('   Usage: node test-fcm-direct.js ExponentPushToken[xxx]');
  console.log('\n📝 Note: For direct FCM, you need the native device token,');
  console.log('   not the Expo Push Token. The native token can be found in');
  console.log('   the device logs when the app registers for notifications.');
  process.exit(1);
}

console.log('\n🔔 Testing FCM Direct with Firebase Admin SDK\n');
console.log(`   Project: ${serviceAccount.project_id}`);
console.log(`   Service Account: ${serviceAccount.client_email}\n`);

// Check if it's an Expo token (we can't use it directly with FCM)
if (expoPushToken.startsWith('ExponentPushToken[')) {
  console.log('⚠️  You provided an Expo Push Token.');
  console.log('   Expo Push Tokens cannot be used directly with FCM.');
  console.log('   You need to either:');
  console.log('   1. Upload FCM credentials to Expo (use eas credentials)');
  console.log('   2. Get the native FCM device token from the app logs');
  console.log('');
  console.log('💡 The native FCM token looks like a long alphanumeric string,');
  console.log('   NOT wrapped in ExponentPushToken[]');
  process.exit(1);
}

// If we have a native FCM token, send the notification
const message = {
  token: expoPushToken,
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
      channelId: 'default',
    },
  },
};

admin.messaging().send(message)
  .then((response) => {
    console.log('✅ SUCCESS! Notification sent!');
    console.log('📬 Message ID:', response);
    console.log('\n   Check your device for the notification! 📱\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error sending notification:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    process.exit(1);
  });

