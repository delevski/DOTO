import { test, expect } from '@playwright/test';

/**
 * Notification Debug Tests
 * 
 * These tests help diagnose notification issues by:
 * 1. Checking if notifications are created in the database
 * 2. Verifying push notification function calls
 * 3. Testing the notification UI
 */

test.describe('Notification Debug Tests', () => {
  
  test('Debug: Check notification page and database state', async ({ page }) => {
    console.log('\n=== NOTIFICATION DEBUG TEST ===\n');
    
    // First, let's just go to the feed and see what's there
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Get current auth state
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    
    console.log('Current auth state:', JSON.stringify(authState, null, 2));
    
    if (!authState?.state?.user) {
      console.log('⚠️ Not logged in - please login first and run test again');
      console.log('Skipping remaining tests...');
      return;
    }
    
    const currentUser = authState.state.user;
    console.log(`\n✅ Logged in as: ${currentUser.name} (ID: ${currentUser.id})`);
    
    // Navigate to notifications
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get page content
    const pageContent = await page.textContent('body');
    console.log('\n📋 Notifications page content (first 1000 chars):');
    console.log(pageContent?.substring(0, 1000));
    
    // Count notification elements
    const notificationItems = await page.locator('[class*="notification"], article, [data-notification]').count();
    console.log(`\n📊 Found ${notificationItems} notification elements on page`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-notifications.png', fullPage: true });
    console.log('📸 Screenshot saved: test-results/debug-notifications.png');
    
    // Check InstantDB data via browser console
    const dbData = await page.evaluate(async () => {
      // This runs in the browser context
      try {
        // Try to access the instant db instance
        if (window.db) {
          const result = await window.db.query({ notifications: {} });
          return {
            success: true,
            count: result?.data?.notifications?.length || 0,
            sample: result?.data?.notifications?.slice(0, 3)
          };
        }
        return { success: false, error: 'db not found in window' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    
    console.log('\n📦 Database query result:', JSON.stringify(dbData, null, 2));
  });

  test('Debug: Monitor console for push notification calls', async ({ page }) => {
    console.log('\n=== PUSH NOTIFICATION CONSOLE MONITOR ===\n');
    
    const pushLogs = [];
    const allLogs = [];
    
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push({ type: msg.type(), text: text.substring(0, 200) });
      
      if (text.includes('push') || text.includes('Push') || 
          text.includes('notification') || text.includes('Notification') ||
          text.includes('🔔') || text.includes('FCM') || text.includes('token')) {
        pushLogs.push(text);
      }
    });
    
    // Navigate and interact
    await page.goto('/feed');
    await page.waitForTimeout(3000);
    
    // Get current user
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    
    if (!authState?.state?.user) {
      console.log('⚠️ Not logged in');
      return;
    }
    
    console.log(`Logged in as: ${authState.state.user.name}`);
    
    // Click on first post
    const firstPost = page.locator('article, [class*="post"]').first();
    if (await firstPost.count() > 0) {
      await firstPost.click();
      await page.waitForTimeout(2000);
    }
    
    // Try to interact (like, comment, claim)
    const likeBtn = page.locator('button').filter({ hasText: /like|heart/i }).first();
    if (await likeBtn.count() > 0) {
      console.log('Clicking like button...');
      await likeBtn.click();
      await page.waitForTimeout(2000);
    }
    
    // Print captured logs
    console.log('\n📝 Push/Notification related logs:');
    pushLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.substring(0, 150)}`);
    });
    
    console.log(`\nTotal console messages captured: ${allLogs.length}`);
    console.log(`Push-related messages: ${pushLogs.length}`);
    
    // Show some general logs if no push logs found
    if (pushLogs.length === 0) {
      console.log('\n📝 No push notification logs found. Recent console messages:');
      allLogs.slice(-10).forEach((log, i) => {
        console.log(`  ${log.type}: ${log.text}`);
      });
    }
  });

  test('Debug: Check user push token in database', async ({ page }) => {
    console.log('\n=== PUSH TOKEN DATABASE CHECK ===\n');
    
    await page.goto('/feed');
    await page.waitForTimeout(2000);
    
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    
    if (!authState?.state?.user) {
      console.log('⚠️ Not logged in');
      return;
    }
    
    const userId = authState.state.user.id;
    console.log(`Checking push token for user: ${userId}`);
    
    // Try to get user data from InstantDB
    const userData = await page.evaluate(async (targetUserId) => {
      try {
        // Check if we can access the db
        if (typeof db !== 'undefined' && db.query) {
          const result = await db.query({ users: {} });
          const users = result?.data?.users || [];
          const user = users.find(u => u.id === targetUserId);
          
          if (user) {
            return {
              success: true,
              userId: user.id,
              name: user.name,
              hasPushToken: !!user.pushToken,
              pushTokenPreview: user.pushToken ? user.pushToken.substring(0, 50) + '...' : 'NONE',
              hasFcmToken: !!user.fcmToken,
              fcmTokenPreview: user.fcmToken ? user.fcmToken.substring(0, 50) + '...' : 'NONE',
              language: user.language,
              pushTokenUpdatedAt: user.pushTokenUpdatedAt
            };
          }
          return { success: false, error: 'User not found in DB' };
        }
        return { success: false, error: 'DB not accessible' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, userId);
    
    console.log('User data from DB:', JSON.stringify(userData, null, 2));
    
    if (userData.success) {
      if (userData.hasPushToken || userData.hasFcmToken) {
        console.log('✅ Push token is saved in database!');
      } else {
        console.log('❌ No push token found in database!');
        console.log('💡 User needs to open the mobile app Settings and tap "Test Notifications"');
      }
    }
  });

  test('Debug: Test notification creation flow', async ({ page }) => {
    console.log('\n=== NOTIFICATION CREATION FLOW TEST ===\n');
    
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });
    
    await page.goto('/feed');
    await page.waitForTimeout(2000);
    
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    
    if (!authState?.state?.user) {
      console.log('⚠️ Not logged in');
      return;
    }
    
    const currentUser = authState.state.user;
    console.log(`Logged in as: ${currentUser.name}`);
    
    // Find a post that is NOT owned by current user
    const posts = await page.evaluate(() => {
      // Try to get posts from the page
      const postElements = document.querySelectorAll('[data-post-id], article');
      return Array.from(postElements).map(el => ({
        text: el.textContent?.substring(0, 100),
        id: el.getAttribute('data-post-id')
      })).slice(0, 5);
    });
    
    console.log('Posts found on page:', posts.length);
    
    // Click on a post
    const postLink = page.locator('article a, [class*="post"] a').first();
    if (await postLink.count() > 0) {
      await postLink.click();
      await page.waitForTimeout(2000);
    }
    
    // Get current URL (should be post detail page)
    const url = page.url();
    console.log('Current URL:', url);
    
    const postIdMatch = url.match(/\/post\/([^\/\?]+)/);
    if (postIdMatch) {
      console.log(`On post detail page: ${postIdMatch[1]}`);
      
      // Check post author
      const postAuthor = await page.evaluate(() => {
        // Try to find author info on page
        const authorEl = document.querySelector('[class*="author"], [data-author]');
        return authorEl?.textContent?.trim() || 'Unknown';
      });
      console.log('Post author:', postAuthor);
      
      // If not our post, try to like it
      const isOwnPost = postAuthor.includes(currentUser.name);
      console.log('Is own post:', isOwnPost);
      
      if (!isOwnPost) {
        console.log('Attempting to like post...');
        
        // Find and click like button
        const likeBtn = page.locator('button').filter({ hasText: /like/i }).first()
          .or(page.locator('[class*="like"]').first())
          .or(page.locator('svg').filter({ has: page.locator('[class*="heart"]') }).first());
        
        if (await likeBtn.count() > 0) {
          await likeBtn.click();
          await page.waitForTimeout(3000);
          console.log('✅ Like action triggered');
        } else {
          console.log('❌ Like button not found');
        }
        
        // Check if notification was created by looking at console logs
        const notificationLogs = logs.filter(l => 
          l.text.includes('notification') || 
          l.text.includes('Notification') ||
          l.text.includes('sendPush')
        );
        
        console.log('\n📝 Notification-related console logs:');
        notificationLogs.slice(-10).forEach(l => {
          console.log(`  [${l.type}] ${l.text.substring(0, 150)}`);
        });
      } else {
        console.log('⚠️ This is your own post, cannot test notifications');
      }
    }
  });

  test('Debug: List all notifications in database', async ({ page }) => {
    console.log('\n=== LIST ALL NOTIFICATIONS IN DATABASE ===\n');
    
    await page.goto('/notifications');
    await page.waitForTimeout(3000);
    
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    
    if (!authState?.state?.user) {
      console.log('⚠️ Not logged in');
      return;
    }
    
    const userId = authState.state.user.id;
    console.log(`Checking notifications for user: ${userId}\n`);
    
    // Get notifications from database
    const dbNotifications = await page.evaluate(async (targetUserId) => {
      try {
        if (typeof db !== 'undefined' && db.query) {
          const result = await db.query({ notifications: {} });
          const allNotifications = result?.data?.notifications || [];
          const userNotifications = allNotifications.filter(n => n.userId === targetUserId);
          
          return {
            success: true,
            totalInDb: allNotifications.length,
            forUser: userNotifications.length,
            notifications: userNotifications.slice(0, 10).map(n => ({
              id: n.id?.substring(0, 8),
              type: n.type,
              message: n.message?.substring(0, 50),
              read: n.read,
              timestamp: n.timestamp ? new Date(n.timestamp).toISOString() : 'N/A',
              postTitle: n.postTitle?.substring(0, 30)
            }))
          };
        }
        return { success: false, error: 'DB not accessible from page context' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, userId);
    
    console.log('Database notifications:', JSON.stringify(dbNotifications, null, 2));
    
    // Also check what's displayed on the page
    const pageNotifications = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="notification-item"], article, [data-notification-id]');
      return Array.from(items).map(el => el.textContent?.substring(0, 100).trim());
    });
    
    console.log('\n📋 Notifications displayed on page:');
    pageNotifications.forEach((n, i) => {
      console.log(`  ${i + 1}. ${n}`);
    });
  });
});

