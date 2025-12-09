/**
 * Push notification proxy server
 * 
 * Supports both:
 * 1. Expo Push API (for EAS-built apps)
 * 2. Firebase Cloud Messaging (FCM) v1 API (for manually-built APKs)
 * 
 * Run with: node push-proxy-server.js
 * Default port: 3002
 */

import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
try {
  let serviceAccount;
  
  // Try environment variable first (for production/Render deployment)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('📦 Using Firebase credentials from environment variable');
  } else {
    // Fall back to local file (for development)
    const serviceAccountPath = join(__dirname, 'firebase-service-account.json');
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('📦 Using Firebase credentials from local file');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  firebaseInitialized = true;
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK not initialized:', error.message);
  console.warn('   FCM v1 API will not be available');
}

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Push proxy server is running',
    fcmConfigured: firebaseInitialized
  });
});

// Proxy endpoint for Expo Push API
app.post('/api/push/send', async (req, res) => {
  try {
    console.log('📤 Expo push request:', {
      to: req.body.to?.substring(0, 50) + '...',
      title: req.body.title,
      body: req.body.body
    });

    // Forward the request to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const result = await response.json();
    
    console.log('📥 Expo response:', {
      status: result.data?.status,
      id: result.data?.id,
      error: result.data?.details?.error
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Expo proxy error:', error);
    res.status(500).json({
      error: 'Failed to send push notification',
      message: error.message
    });
  }
});

// FCM endpoint using Firebase Admin SDK (v1 API)
app.post('/api/fcm/send', async (req, res) => {
  try {
    const { token, notification, data } = req.body;
    
    console.log('📤 FCM push request:', {
      token: token?.substring(0, 50) + '...',
      title: notification?.title,
      body: notification?.body
    });

    if (!firebaseInitialized) {
      console.error('❌ Firebase Admin SDK not initialized');
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin SDK not initialized. Check firebase-service-account.json'
      });
    }

    // Send via FCM v1 API using Firebase Admin SDK
    const message = {
      token: token,
      notification: {
        title: notification?.title,
        body: notification?.body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    const response = await admin.messaging().send(message);
    
    console.log('📥 FCM response:', response);

    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('❌ FCM proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.code || 'Unknown error',
      message: error.message
    });
  }
});

// Smart endpoint - automatically detects token type and routes appropriately
app.post('/api/smart/send', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;
    
    console.log('📤 Smart push request:', {
      token: token?.substring(0, 50) + '...',
      title,
      body
    });

    const isExpoToken = token?.startsWith('ExponentPushToken[');
    
    if (isExpoToken) {
      // Use Expo API
      console.log('🔀 Routing to Expo API...');
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
          data: data || {},
        }),
      });

      const result = await response.json();
      console.log('📥 Expo response:', result);
      
      res.json({ 
        success: result.data?.status === 'ok',
        provider: 'expo',
        result 
      });
    } else {
      // Use FCM v1 API
      console.log('🔀 Routing to FCM v1 API...');
      
      if (!firebaseInitialized) {
        return res.status(500).json({
          success: false,
          error: 'Firebase Admin SDK not initialized for FCM tokens'
        });
      }

      const message = {
        token: token,
        notification: { title, body },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('📥 FCM response:', response);
      
      res.json({ 
        success: true,
        provider: 'fcm',
        messageId: response 
      });
    }
  } catch (error) {
    console.error('❌ Smart proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.code || 'Unknown error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Push proxy server running on http://localhost:${PORT}`);
  console.log('');
  console.log('📡 Endpoints:');
  console.log(`   POST http://localhost:${PORT}/api/push/send  - Expo Push API`);
  console.log(`   POST http://localhost:${PORT}/api/fcm/send   - Firebase FCM v1`);
  console.log(`   POST http://localhost:${PORT}/api/smart/send - Auto-detect`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log('');
  if (firebaseInitialized) {
    console.log('✅ FCM v1 API ready (Firebase Admin SDK)');
  } else {
    console.log('⚠️  FCM not available. Add firebase-service-account.json');
  }
});
