#!/usr/bin/env node
/**
 * Push Notification Test Script for DOTO
 * 
 * Usage:
 *   node test-push-notification.js <expo-push-token>
 * 
 * Example:
 *   node test-push-notification.js ExponentPushToken[xxxxxxxxxxxxxx]
 * 
 * To find your push token:
 *   1. Run the app on your device/emulator
 *   2. Login to your account
 *   3. Check the console logs for "Push token:" message
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendTestNotification(pushToken) {
  if (!pushToken) {
    console.log('\n❌ No push token provided!\n');
    console.log('Usage: node test-push-notification.js <expo-push-token>');
    console.log('\nHow to find your push token:');
    console.log('  1. Run the app: npx expo start --android');
    console.log('  2. Login to your account');
    console.log('  3. Look in the Metro console for: "Push token: ExponentPushToken[xxx]"');
    console.log('  4. Copy that token and run this script again\n');
    process.exit(1);
  }

  console.log('\n🔔 Sending test push notification...\n');
  console.log(`   Token: ${pushToken}`);

  const message = {
    to: pushToken,
    sound: 'default',
    title: '🎉 Test Notification from DOTO!',
    body: 'Push notifications are working correctly! Tap to open the app.',
    data: { 
      type: 'test',
      timestamp: new Date().toISOString() 
    },
    badge: 1,
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    console.log('\n📬 Response from Expo Push API:');
    console.log(JSON.stringify(result, null, 2));

    if (result.data?.status === 'ok' || result.data?.[0]?.status === 'ok') {
      console.log('\n✅ SUCCESS! Push notification sent!');
      console.log('   Check your device for the notification.\n');
    } else if (result.data?.status === 'error' || result.data?.[0]?.status === 'error') {
      const error = result.data?.message || result.data?.[0]?.message || 'Unknown error';
      console.log('\n❌ FAILED to send notification:');
      console.log(`   Error: ${error}\n`);
      
      if (error.includes('DeviceNotRegistered')) {
        console.log('   💡 The push token is invalid or expired.');
        console.log('   Please re-login to the app to get a new token.\n');
      }
    } else {
      console.log('\n⚠️  Unexpected response. Please check the result above.\n');
    }

  } catch (error) {
    console.log('\n❌ Error sending notification:');
    console.log(`   ${error.message}\n`);
  }
}

// Get push token from command line argument
const pushToken = process.argv[2];
sendTestNotification(pushToken);
