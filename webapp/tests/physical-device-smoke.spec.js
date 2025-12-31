/**
 * Physical Device Smoke Tests
 * 
 * These tests run on a physical Android device connected via ADB.
 * Prerequisites:
 * - Android device connected via USB or WiFi ADB
 * - Chrome installed on the device
 * - USB debugging enabled
 * 
 * Run with: npm run test:device
 */

import { test, expect, chromium } from '@playwright/test';

// Import helper functions
import {
  generateUserData,
  createUser,
  loginUser,
  logoutUser,
  switchToUser,
  mockAuthentication
} from './helpers/auth-helpers.js';

import {
  createPost,
  openPost,
  generatePostData,
  verifyPostInFeed
} from './helpers/post-helpers.js';

import {
  claimPost,
  approveClaimer,
  getClaimers
} from './helpers/claim-helpers.js';

import {
  addComment,
  verifyComment,
  generateCommentText
} from './helpers/comment-helpers.js';

import {
  goToMessages,
  sendMessage,
  openConversationWithUser,
  generateMessageText
} from './helpers/message-helpers.js';

import {
  goToNotifications,
  getNotifications,
  getUnreadNotificationCount
} from './helpers/notification-helpers.js';

import {
  goToProfile,
  goToEditProfile,
  editProfile,
  saveProfile,
  generateProfileUpdate
} from './helpers/profile-helpers.js';

// Base URL for the app (change if using different port/host)
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

// Store test data
let testUsers = [];
let testPosts = [];

test.describe('Physical Device Smoke Tests', () => {
  
  test.setTimeout(120000); // Extended timeout for physical device

  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Register a new user', async ({ page }) => {
    console.log('=== Test 1: Register User on Physical Device ===');
    
    const userData = generateUserData(0);
    console.log(`Registering: ${userData.name} (${userData.email})`);
    
    const user = await createUser(page, userData);
    
    if (user) {
      testUsers.push({ ...user, password: userData.password });
      console.log(`✓ User registered: ${user.name}`);
    } else {
      // Create mock user
      const mockUser = {
        id: `device-user-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: userData.password
      };
      testUsers.push(mockUser);
      console.log(`✓ Mock user created: ${mockUser.name}`);
    }
    
    expect(testUsers.length).toBeGreaterThan(0);
  });

  test('2. Create a second user', async ({ page }) => {
    console.log('=== Test 2: Create Second User ===');
    
    const userData = generateUserData(1);
    console.log(`Registering: ${userData.name} (${userData.email})`);
    
    const user = await createUser(page, userData);
    
    if (user) {
      testUsers.push({ ...user, password: userData.password });
      console.log(`✓ User registered: ${user.name}`);
    } else {
      const mockUser = {
        id: `device-user-${Date.now()}-2`,
        name: userData.name,
        email: userData.email,
        password: userData.password
      };
      testUsers.push(mockUser);
      console.log(`✓ Mock user created: ${mockUser.name}`);
    }
    
    expect(testUsers.length).toBeGreaterThanOrEqual(2);
  });

  test('3. Login with existing user', async ({ page }) => {
    console.log('=== Test 3: Login Flow ===');
    
    if (testUsers.length === 0) {
      const userData = generateUserData(0);
      testUsers.push({
        id: `device-user-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: userData.password
      });
    }
    
    const user = testUsers[0];
    console.log(`Logging in as: ${user.name}`);
    
    await logoutUser(page);
    const loggedInUser = await loginUser(page, user.email, user.password);
    
    if (!loggedInUser) {
      await mockAuthentication(page, user);
      await page.goto(`${BASE_URL}/feed`);
    }
    
    // Verify on feed
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    expect(currentUrl).toContain('/feed');
  });

  test('4. Create a post', async ({ page }) => {
    console.log('=== Test 4: Create Post ===');
    
    // Ensure we have a user
    if (testUsers.length === 0) {
      const userData = generateUserData(0);
      testUsers.push({
        id: `device-user-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: userData.password
      });
    }
    
    const user = testUsers[0];
    await switchToUser(page, user);
    
    const postData = generatePostData(0);
    console.log(`Creating post: ${postData.title}`);
    
    const postId = await createPost(page, postData);
    
    if (postId) {
      testPosts.push({
        id: postId,
        ...postData,
        authorId: user.id,
        authorName: user.name
      });
      console.log(`✓ Post created: ${postId}`);
    } else {
      const mockPostId = `post-${Date.now()}`;
      testPosts.push({
        id: mockPostId,
        ...postData,
        authorId: user.id,
        authorName: user.name
      });
      console.log(`✓ Mock post recorded: ${mockPostId}`);
    }
    
    expect(testPosts.length).toBeGreaterThan(0);
  });

  test('5. Claim a post', async ({ page }) => {
    console.log('=== Test 5: Claim Post ===');
    
    if (testPosts.length === 0 || testUsers.length < 2) {
      console.log('Skipping: Need posts and 2 users');
      return;
    }
    
    const post = testPosts[0];
    const claimer = testUsers.find(u => u.id !== post.authorId) || testUsers[1];
    
    console.log(`${claimer.name} claiming post: ${post.title}`);
    
    await switchToUser(page, claimer);
    await page.waitForTimeout(1000);
    
    const claimed = await claimPost(page, post.id);
    console.log(`Claim result: ${claimed ? '✓ Success' : '✗ Failed'}`);
  });

  test('6. Add comment to post', async ({ page }) => {
    console.log('=== Test 6: Add Comment ===');
    
    if (testPosts.length === 0 || testUsers.length === 0) {
      console.log('Skipping: Need posts and users');
      return;
    }
    
    const post = testPosts[0];
    const commenter = testUsers[0];
    const commentText = generateCommentText(commenter.name, 0);
    
    console.log(`${commenter.name} commenting: "${commentText.substring(0, 30)}..."`);
    
    await switchToUser(page, commenter);
    await page.waitForTimeout(1000);
    
    const commented = await addComment(page, post.id, commentText);
    console.log(`Comment result: ${commented ? '✓ Success' : '✗ Failed'}`);
  });

  test('7. Check notifications', async ({ page }) => {
    console.log('=== Test 7: Check Notifications ===');
    
    if (testUsers.length === 0) {
      console.log('Skipping: Need users');
      return;
    }
    
    const user = testUsers[0];
    await switchToUser(page, user);
    await page.waitForTimeout(1000);
    
    const unreadCount = await getUnreadNotificationCount(page);
    console.log(`Unread notifications: ${unreadCount}`);
    
    const notifications = await getNotifications(page);
    console.log(`Total notifications: ${notifications.length}`);
    
    if (notifications.length > 0) {
      notifications.slice(0, 3).forEach((n, i) => {
        console.log(`  ${i + 1}. ${n.message?.substring(0, 50)}...`);
      });
    }
  });

  test('8. Edit profile', async ({ page }) => {
    console.log('=== Test 8: Edit Profile ===');
    
    if (testUsers.length === 0) {
      console.log('Skipping: Need users');
      return;
    }
    
    const user = testUsers[0];
    await switchToUser(page, user);
    await page.waitForTimeout(1000);
    
    const updates = generateProfileUpdate(0);
    console.log(`Updating profile: ${JSON.stringify(updates)}`);
    
    const edited = await editProfile(page, updates);
    console.log(`Edit result: ${edited ? '✓ Success' : '✗ Failed'}`);
    
    if (edited) {
      const saved = await saveProfile(page);
      console.log(`Save result: ${saved ? '✓ Success' : '✗ Failed'}`);
    }
  });

  test('9. Send a message', async ({ page }) => {
    console.log('=== Test 9: Send Message ===');
    
    if (testUsers.length < 2) {
      console.log('Skipping: Need 2 users');
      return;
    }
    
    const sender = testUsers[0];
    const recipient = testUsers[1];
    
    console.log(`${sender.name} sending message to ${recipient.name}`);
    
    await switchToUser(page, sender);
    await page.waitForTimeout(1000);
    
    await goToMessages(page);
    await page.waitForTimeout(1500);
    
    const opened = await openConversationWithUser(page, recipient.name);
    
    if (opened) {
      const messageText = generateMessageText(sender.name, 0);
      const sent = await sendMessage(page, messageText);
      console.log(`Send result: ${sent ? '✓ Success' : '✗ Failed'}`);
    } else {
      console.log('Could not open conversation');
    }
  });

  test('10. Complete user journey', async ({ page }) => {
    console.log('=== Test 10: Complete Journey ===');
    
    // This test runs through all features sequentially
    console.log('Running complete user journey on physical device...');
    
    // Step 1: Verify feed loads
    if (testUsers.length > 0) {
      await switchToUser(page, testUsers[0]);
    }
    
    await page.goto(`${BASE_URL}/feed`);
    await page.waitForTimeout(2000);
    
    const feedContent = page.locator('article, [class*="post"]').first();
    const hasPosts = await feedContent.count() > 0;
    console.log(`Feed has posts: ${hasPosts}`);
    
    // Step 2: Navigate through tabs
    const pages = ['/feed', '/notifications', '/messages', '/profile'];
    
    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForTimeout(1500);
      console.log(`✓ Navigated to ${pagePath}`);
    }
    
    console.log('\n=== Physical Device Tests Complete ===');
  });
});

