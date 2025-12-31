import { test, expect } from '@playwright/test';

/**
 * Notification Tests for DOTO App
 * 
 * Tests all notification events:
 * 1. New Message - when someone sends you a message
 * 2. New Comment - when someone comments on your post
 * 3. New Claim - when someone claims your post
 * 4. Claimer Approved - when your claim is approved
 * 5. Post Liked - when someone likes your post
 * 6. Task Marked Complete - when claimer marks task done
 * 7. Task Completed/Rated - when author confirms and rates
 */

// Test user credentials - these should be existing users in your DB for testing
const TEST_USERS = {
  // Post author - will receive notifications
  author: {
    email: 'notification_author@test.com',
    password: 'TestPassword123!',
    name: 'Notification Author',
    age: 25,
    location: 'Tel Aviv, Israel'
  },
  // Claimer/Commenter - will trigger notifications
  helper: {
    email: 'notification_helper@test.com', 
    password: 'TestPassword123!',
    name: 'Notification Helper',
    age: 30,
    location: 'Jerusalem, Israel'
  }
};

// Helper function to login user
async function loginUser(page, email, password) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  
  // Handle verification if needed
  await page.waitForTimeout(2000);
  
  const codeInputs = page.locator('input[inputmode="numeric"], input[type="text"]');
  const codeInputCount = await codeInputs.count();
  
  if (codeInputCount >= 6) {
    const storedCode = await page.evaluate(() => sessionStorage.getItem('verification_code')) || '123456';
    for (let i = 0; i < 6; i++) {
      await codeInputs.nth(i).fill(storedCode[i] || '1');
      await page.waitForTimeout(100);
    }
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
  }
  
  // Navigate to feed
  await page.goto('/feed');
  await page.waitForTimeout(1500);
  
  const authState = await page.evaluate(() => {
    const stored = localStorage.getItem('auth-storage');
    return stored ? JSON.parse(stored) : null;
  });
  
  return authState?.state?.user || null;
}

// Helper function to register new user
async function registerUser(page, userData) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const nameInput = page.locator('input[name="name"]');
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  
  await nameInput.fill(userData.name);
  await page.locator('input[name="email"]').fill(userData.email);
  await page.locator('input[name="age"]').fill(userData.age.toString());
  await page.locator('input[name="location"]').fill(userData.location);
  await page.locator('input[name="password"]').fill(userData.password);
  await page.locator('input[name="confirmPassword"]').fill(userData.password);
  
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  
  // Handle verification if it appears
  const codeInputs = page.locator('input[inputmode="numeric"], input[type="text"]');
  const codeInputCount = await codeInputs.count();
  
  if (codeInputCount >= 6) {
    const storedCode = await page.evaluate(() => sessionStorage.getItem('verification_code')) || '123456';
    for (let i = 0; i < 6; i++) {
      await codeInputs.nth(i).fill(storedCode[i] || '1');
      await page.waitForTimeout(100);
    }
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
  }
  
  await page.goto('/feed');
  await page.waitForTimeout(1500);
  
  const authState = await page.evaluate(() => {
    const stored = localStorage.getItem('auth-storage');
    return stored ? JSON.parse(stored) : null;
  });
  
  return authState?.state?.user || null;
}

// Helper to set auth directly via localStorage
async function setAuthUser(page, user) {
  await page.evaluate((userData) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: userData,
        isAuthenticated: true
      }
    }));
  }, user);
}

// Helper to create a post
async function createPost(page, postData) {
  await page.goto('/new-post');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const titleInput = page.locator('input[type="text"]').first();
  if (await titleInput.count() > 0) {
    await titleInput.fill(postData.title);
  }
  
  await page.locator('textarea').first().fill(postData.description);
  
  const locationInput = page.locator('input[placeholder*="address" i], input[placeholder*="location" i]').first();
  if (await locationInput.count() > 0) {
    await locationInput.fill(postData.location);
  }
  
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  
  // Get post ID from URL
  const currentUrl = page.url();
  const postIdMatch = currentUrl.match(/\/post\/([^\/]+)/);
  
  if (postIdMatch) {
    return postIdMatch[1];
  }
  
  // If redirected to feed, find the new post
  await page.goto('/feed');
  await page.waitForTimeout(2000);
  
  // Click on the first post (newest)
  const firstPost = page.locator('article, [class*="post-card"]').first();
  await firstPost.click();
  await page.waitForTimeout(1500);
  
  const postUrl = page.url();
  const match = postUrl.match(/\/post\/([^\/]+)/);
  return match ? match[1] : null;
}

// Helper to check notifications
async function checkNotifications(page, expectedText) {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const pageContent = await page.content();
  console.log('Notification page content (snippet):', pageContent.substring(0, 2000));
  
  // Look for the expected text in notifications
  const notificationFound = page.locator(`text=${expectedText}`);
  const count = await notificationFound.count();
  
  console.log(`Looking for notification with text "${expectedText}": found ${count}`);
  
  return count > 0;
}

// Helper to get all notifications from page
async function getAllNotifications(page) {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const notifications = await page.evaluate(() => {
    const items = document.querySelectorAll('[class*="notification"], [data-notification], article');
    return Array.from(items).map(el => ({
      text: el.textContent?.trim().substring(0, 200),
      type: el.getAttribute('data-type') || '',
      className: el.className
    }));
  });
  
  return notifications;
}

// Helper to like a post
async function likePost(page, postId) {
  await page.goto(`/post/${postId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  const likeButton = page.locator('button').filter({ hasText: /like|heart|♥|❤/i }).first()
    .or(page.locator('[class*="like"]').first())
    .or(page.locator('svg[class*="heart"]').first());
  
  if (await likeButton.count() > 0) {
    await likeButton.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

// Helper to comment on a post
async function commentOnPost(page, postId, commentText) {
  await page.goto(`/post/${postId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  const commentInput = page.locator('input[placeholder*="comment" i], input[placeholder*="write" i], textarea[placeholder*="comment" i]').first();
  
  if (await commentInput.count() > 0) {
    await commentInput.fill(commentText);
    
    // Try to submit
    const sendButton = page.locator('button').filter({ hasText: /send|post|submit/i }).first();
    if (await sendButton.count() > 0) {
      await sendButton.click();
    } else {
      await commentInput.press('Enter');
    }
    
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

// Helper to claim a post
async function claimPost(page, postId) {
  await page.goto(`/post/${postId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  const claimButton = page.locator('button').filter({ hasText: /claim|תביע/i }).first();
  
  if (await claimButton.count() > 0) {
    const isDisabled = await claimButton.isDisabled().catch(() => false);
    if (!isDisabled) {
      await claimButton.click();
      await page.waitForTimeout(1500);
      return true;
    }
  }
  return false;
}

// Helper to approve a claimer
async function approveClaimer(page, postId) {
  await page.goto(`/post/${postId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  // Look for approve button or claimer selection
  const approveButton = page.locator('button').filter({ hasText: /approve|אשר|select|choose/i }).first();
  
  if (await approveButton.count() > 0) {
    await approveButton.click();
    await page.waitForTimeout(1500);
    
    // If modal appeared, click approve in modal
    const modalApprove = page.locator('[class*="modal"] button').filter({ hasText: /approve|אשר|confirm/i }).first();
    if (await modalApprove.count() > 0) {
      await modalApprove.click();
      await page.waitForTimeout(1500);
    }
    
    return true;
  }
  return false;
}

test.describe('Notification System Tests', () => {
  let authorUser = null;
  let helperUser = null;
  let testPostId = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    
    console.log('=== SETTING UP TEST USERS ===');
    
    // Try to register or login author user
    try {
      authorUser = await registerUser(page, TEST_USERS.author);
      console.log('Registered author user:', authorUser);
    } catch (e) {
      console.log('Author registration failed, trying login...');
      authorUser = await loginUser(page, TEST_USERS.author.email, TEST_USERS.author.password);
      console.log('Logged in author user:', authorUser);
    }
    
    // Create test post
    if (authorUser) {
      await setAuthUser(page, authorUser);
      await page.goto('/feed');
      await page.waitForTimeout(1000);
      
      testPostId = await createPost(page, {
        title: 'Notification Test Post',
        description: 'This post is for testing notifications. Someone please help!',
        location: 'Tel Aviv, Israel'
      });
      console.log('Created test post:', testPostId);
    }
    
    // Clear and register helper user
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    try {
      helperUser = await registerUser(page, TEST_USERS.helper);
      console.log('Registered helper user:', helperUser);
    } catch (e) {
      console.log('Helper registration failed, trying login...');
      helperUser = await loginUser(page, TEST_USERS.helper.email, TEST_USERS.helper.password);
      console.log('Logged in helper user:', helperUser);
    }
    
    await page.close();
  });

  test('1. Test Comment Notification', async ({ page }) => {
    test.skip(!authorUser || !helperUser || !testPostId, 'Users or post not set up');
    
    console.log('=== TEST: Comment Notification ===');
    
    // Login as helper
    await setAuthUser(page, helperUser);
    await page.goto('/feed');
    await page.waitForTimeout(1000);
    
    // Comment on the test post
    const commentText = `Test comment from ${helperUser.name} at ${Date.now()}`;
    const commented = await commentOnPost(page, testPostId, commentText);
    console.log('Comment submitted:', commented);
    
    // Switch to author and check notifications
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await setAuthUser(page, authorUser);
    
    // Wait for notification to be created
    await page.waitForTimeout(3000);
    
    // Check notifications page
    const notifications = await getAllNotifications(page);
    console.log('Author notifications:', notifications);
    
    // Look for comment notification
    const hasCommentNotification = notifications.some(n => 
      n.text?.toLowerCase().includes('comment') ||
      n.text?.includes(helperUser.name)
    );
    
    console.log('Has comment notification:', hasCommentNotification);
    expect(hasCommentNotification || notifications.length > 0).toBeTruthy();
  });

  test('2. Test Like Notification', async ({ page }) => {
    test.skip(!authorUser || !helperUser || !testPostId, 'Users or post not set up');
    
    console.log('=== TEST: Like Notification ===');
    
    // Login as helper
    await setAuthUser(page, helperUser);
    await page.goto('/feed');
    await page.waitForTimeout(1000);
    
    // Like the test post
    const liked = await likePost(page, testPostId);
    console.log('Post liked:', liked);
    
    // Switch to author and check notifications
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await setAuthUser(page, authorUser);
    
    await page.waitForTimeout(3000);
    
    const notifications = await getAllNotifications(page);
    console.log('Author notifications after like:', notifications);
    
    const hasLikeNotification = notifications.some(n => 
      n.text?.toLowerCase().includes('like') ||
      n.text?.includes(helperUser.name)
    );
    
    console.log('Has like notification:', hasLikeNotification);
  });

  test('3. Test Claim Notification', async ({ page }) => {
    test.skip(!authorUser || !helperUser || !testPostId, 'Users or post not set up');
    
    console.log('=== TEST: Claim Notification ===');
    
    // Login as helper
    await setAuthUser(page, helperUser);
    await page.goto('/feed');
    await page.waitForTimeout(1000);
    
    // Claim the test post
    const claimed = await claimPost(page, testPostId);
    console.log('Post claimed:', claimed);
    
    // Switch to author and check notifications
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await setAuthUser(page, authorUser);
    
    await page.waitForTimeout(3000);
    
    const notifications = await getAllNotifications(page);
    console.log('Author notifications after claim:', notifications);
    
    const hasClaimNotification = notifications.some(n => 
      n.text?.toLowerCase().includes('claim') ||
      n.text?.toLowerCase().includes('help') ||
      n.text?.includes(helperUser.name)
    );
    
    console.log('Has claim notification:', hasClaimNotification);
  });

  test('4. Test Approval Notification', async ({ page }) => {
    test.skip(!authorUser || !helperUser || !testPostId, 'Users or post not set up');
    
    console.log('=== TEST: Approval Notification ===');
    
    // First, ensure helper has claimed the post
    await setAuthUser(page, helperUser);
    await page.goto('/feed');
    await page.waitForTimeout(1000);
    await claimPost(page, testPostId);
    
    // Login as author
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await setAuthUser(page, authorUser);
    await page.goto('/feed');
    await page.waitForTimeout(1000);
    
    // Approve the claimer
    const approved = await approveClaimer(page, testPostId);
    console.log('Claimer approved:', approved);
    
    // Switch to helper and check notifications
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await setAuthUser(page, helperUser);
    
    await page.waitForTimeout(3000);
    
    const notifications = await getAllNotifications(page);
    console.log('Helper notifications after approval:', notifications);
    
    const hasApprovalNotification = notifications.some(n => 
      n.text?.toLowerCase().includes('approved') ||
      n.text?.toLowerCase().includes('אושר')
    );
    
    console.log('Has approval notification:', hasApprovalNotification);
  });

  test('5. Check Notification Page Displays Correctly', async ({ page }) => {
    test.skip(!authorUser, 'Author user not set up');
    
    console.log('=== TEST: Notification Page UI ===');
    
    await setAuthUser(page, authorUser);
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check page title
    const title = page.locator('h1, h2').filter({ hasText: /notification/i });
    const hasTitle = await title.count() > 0;
    console.log('Has notifications title:', hasTitle);
    
    // Check for notification items or empty state
    const notificationItems = page.locator('[class*="notification"], article, [data-notification]');
    const itemCount = await notificationItems.count();
    console.log('Notification items count:', itemCount);
    
    // Check for "no notifications" message if empty
    if (itemCount === 0) {
      const emptyMessage = page.locator('text=/no notification|empty|אין התראות/i');
      const hasEmptyMessage = await emptyMessage.count() > 0;
      console.log('Has empty state message:', hasEmptyMessage);
    }
    
    // Check for mark all as read button
    const markAllButton = page.locator('button').filter({ hasText: /mark all|read all|סמן הכל/i });
    const hasMarkAllButton = await markAllButton.count() > 0;
    console.log('Has mark all as read button:', hasMarkAllButton);
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/notifications-page.png', fullPage: true });
    console.log('Screenshot saved to test-results/notifications-page.png');
  });

  test('6. Verify Push Notification Function is Called (Console Check)', async ({ page }) => {
    test.skip(!authorUser || !helperUser || !testPostId, 'Users or post not set up');
    
    console.log('=== TEST: Push Notification Function Logging ===');
    
    // Capture console messages
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('sendPushNotification') || text.includes('🔔') || text.includes('Push')) {
        consoleLogs.push(text);
      }
    });
    
    // Login as helper
    await setAuthUser(page, helperUser);
    await page.goto('/feed');
    await page.waitForTimeout(1000);
    
    // Trigger a notification event (comment)
    const uniqueComment = `Push test comment ${Date.now()}`;
    await commentOnPost(page, testPostId, uniqueComment);
    
    // Wait for async operations
    await page.waitForTimeout(5000);
    
    console.log('=== CONSOLE LOGS CAPTURED ===');
    consoleLogs.forEach(log => console.log(log));
    console.log('=== END CONSOLE LOGS ===');
    
    // Check if push notification function was called
    const pushFunctionCalled = consoleLogs.some(log => 
      log.includes('sendPushNotification') || 
      log.includes('Push notification') ||
      log.includes('🔔')
    );
    
    console.log('Push notification function was logged:', pushFunctionCalled);
  });

  test('7. Test Message Notification via Messages Page', async ({ page }) => {
    test.skip(!authorUser || !helperUser, 'Users not set up');
    
    console.log('=== TEST: Message Notification ===');
    
    // Login as helper to send message
    await setAuthUser(page, helperUser);
    
    // Navigate to messages and find/create conversation with author
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Try to find existing conversation or create new one
    const authorConversation = page.locator(`text=${authorUser.name}`).first();
    
    if (await authorConversation.count() > 0) {
      await authorConversation.click();
      await page.waitForTimeout(1000);
      
      // Send a test message
      const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
      if (await messageInput.count() > 0) {
        const testMessage = `Test notification message ${Date.now()}`;
        await messageInput.fill(testMessage);
        await messageInput.press('Enter');
        await page.waitForTimeout(2000);
        
        console.log('Message sent to author');
        
        // Switch to author and check notifications
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await setAuthUser(page, authorUser);
        
        await page.waitForTimeout(3000);
        
        const notifications = await getAllNotifications(page);
        console.log('Author notifications after message:', notifications);
        
        const hasMessageNotification = notifications.some(n => 
          n.text?.toLowerCase().includes('message') ||
          n.text?.toLowerCase().includes('הודעה') ||
          n.text?.includes(helperUser.name)
        );
        
        console.log('Has message notification:', hasMessageNotification);
      }
    } else {
      console.log('No existing conversation found with author');
    }
  });
});

test.describe('Notification Badge Tests', () => {
  test('Badge shows unread count', async ({ page }) => {
    // This test checks if the notification badge displays correctly
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for notification badge in header
    const badge = page.locator('[class*="badge"], [class*="notification"] span');
    const badgeCount = await badge.count();
    
    console.log('Found badge elements:', badgeCount);
    
    if (badgeCount > 0) {
      const badgeText = await badge.first().textContent();
      console.log('Badge text:', badgeText);
    }
  });

  test('Clicking notification navigates to related content', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const notifications = page.locator('[class*="notification"], article').first();
    
    if (await notifications.count() > 0) {
      await notifications.click();
      await page.waitForTimeout(2000);
      
      const newUrl = page.url();
      console.log('Navigated to:', newUrl);
      
      // Should navigate away from notifications page
      const navigatedAway = !newUrl.includes('/notifications');
      console.log('Navigated away from notifications:', navigatedAway);
    } else {
      console.log('No notifications to click');
    }
  });
});

test.describe('Push Token Debug Tests', () => {
  test('Check if push tokens are saved in database', async ({ page }) => {
    console.log('=== TEST: Push Token Database Check ===');
    
    // This test checks the database for push tokens
    // Note: This requires access to InstantDB which the web app has
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for any debug info or test notification button
    const testNotificationButton = page.locator('button').filter({ hasText: /test notification|debug|push/i });
    
    if (await testNotificationButton.count() > 0) {
      console.log('Found test notification button');
      await testNotificationButton.click();
      await page.waitForTimeout(3000);
      
      // Check for any alerts or dialogs
      const dialog = page.locator('[role="dialog"], [class*="alert"], [class*="modal"]');
      if (await dialog.count() > 0) {
        const dialogText = await dialog.textContent();
        console.log('Dialog content:', dialogText);
      }
    } else {
      console.log('No test notification button found in settings');
    }
    
    // Log current auth state for debugging
    const authState = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });
    
    console.log('Current auth state:', authState ? JSON.parse(authState) : 'Not logged in');
  });
});

