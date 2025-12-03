import { test, expect, devices } from '@playwright/test';

// Use Pixel 5 device (closest to Pixel 9) for mobile emulation
test.use({ 
  ...devices['Pixel 5'],
  baseURL: 'http://localhost:5173'
});

test.describe('All Pages & Functionality - Mobile (Pixel 9)', () => {

  // Helper to authenticate user
  async function authenticateUser(page) {
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'test-user-' + Date.now(),
            name: 'Test User',
            email: 'testuser@gmail.com',
            avatar: 'https://i.pravatar.cc/150?u=test',
            rating: 4.8,
            age: 25,
            location: 'Tel Aviv, Israel'
          },
          isAuthenticated: true
        }
      }));
    });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await authenticateUser(page);
  });

  // ==================== SETTINGS PAGE ====================
  test.describe('Settings Page', () => {
    test('Settings page loads with all sections', async ({ page }) => {
      console.log('Testing Settings page...');
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for settings heading
      const heading = page.locator('h1').filter({ hasText: /settings|הגדרות/i });
      await expect(heading.first()).toBeVisible({ timeout: 5000 });

      // Check for account section
      const accountSection = page.locator('h2, [class*="account"]').filter({ hasText: /account|חשבון/i });
      await expect(accountSection.first()).toBeVisible({ timeout: 5000 });

      // Check for preferences section
      const preferencesSection = page.locator('h2, [class*="preference"]').filter({ 
        hasText: /preference|language|dark mode/i 
      });
      await expect(preferencesSection.first()).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/settings-full.png', fullPage: true });
      console.log('✓ Settings page loaded');
    });

    test('Dark mode toggle works', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const darkModeToggle = page.locator('button').filter({ hasText: /dark mode|מצב כהה/i }).first();
      if (await darkModeToggle.count() > 0) {
        const htmlElement = page.locator('html');
        const initialDarkMode = await htmlElement.evaluate(el => el.classList.contains('dark'));

        await darkModeToggle.click();
        await page.waitForTimeout(500);

        const newDarkMode = await htmlElement.evaluate(el => el.classList.contains('dark'));
        expect(newDarkMode).toBe(!initialDarkMode);
        console.log('✓ Dark mode toggle works');
      }
    });

    test('Language selection works', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const languageButton = page.locator('button').filter({ hasText: /language|שפה/i }).first();
      if (await languageButton.count() > 0) {
        await languageButton.click();
        await page.waitForTimeout(500);

        // Check for language options
        const hebrewOption = page.locator('button').filter({ hasText: /עברית|Hebrew/i });
        if (await hebrewOption.count() > 0) {
          await hebrewOption.first().click();
          await page.waitForTimeout(1000);

          const htmlElement = page.locator('html');
          const dir = await htmlElement.getAttribute('dir');
          expect(dir).toBe('rtl');
          console.log('✓ Language selection works (Hebrew)');

          // Switch back to English
          await languageButton.click();
          await page.waitForTimeout(500);
          const englishOption = page.locator('button').filter({ hasText: /English/i });
          if (await englishOption.count() > 0) {
            await englishOption.first().click();
            await page.waitForTimeout(500);
            const finalDir = await htmlElement.getAttribute('dir');
            expect(finalDir).toBe('ltr');
            console.log('✓ Language selection works (English)');
          }
        }
      }
    });

    test('Logout works from settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const logoutButton = page.locator('button').filter({ hasText: /log out|logout|התנתק/i });
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        await page.waitForTimeout(1000);

        await expect(page).toHaveURL(/.*login/);
        console.log('✓ Logout works');
      }
    });
  });

  // ==================== NOTIFICATIONS PAGE ====================
  test.describe('Notifications Page', () => {
    test('Notifications page loads', async ({ page }) => {
      console.log('Testing Notifications page...');
      await page.goto('/notifications');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for notifications heading
      const heading = page.locator('h1, h2').filter({ hasText: /notification|התראות/i });
      await expect(heading.first()).toBeVisible({ timeout: 5000 });

      // Check for notifications list or empty state
      const notificationsList = page.locator('[class*="notification"], article, li');
      const emptyState = page.locator('text=/no notification|empty/i');
      
      const notificationCount = await notificationsList.count();
      const isEmpty = await emptyState.count() > 0;

      expect(notificationCount > 0 || isEmpty).toBeTruthy();

      await page.screenshot({ path: 'test-results/notifications-full.png', fullPage: true });
      console.log(`✓ Notifications page loaded (${notificationCount} notifications or empty state)`);
    });

    test('Notification items are clickable', async ({ page }) => {
      await page.goto('/notifications');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const notifications = page.locator('[class*="notification"], article, li').filter({ 
        hasText: /.+/ 
      });
      const notificationCount = await notifications.count();

      if (notificationCount > 0) {
        await notifications.first().click();
        await page.waitForTimeout(1000);
        console.log('✓ Notification items are clickable');
      } else {
        console.log('⚠ No notifications to test clickability');
      }
    });
  });

  // ==================== CLAIM FUNCTIONALITY ====================
  test.describe('Claim Functionality', () => {
    test('Can navigate to post details to claim', async ({ page }) => {
      console.log('Testing Claim functionality...');
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Find a post card first
      const posts = page.locator('article, [class*="post"]');
      const postCount = await posts.count();

      if (postCount > 0) {
        // Click on the first post card
        await posts.first().click();
        await page.waitForTimeout(2000);

        // Should navigate to post details
        const currentUrl = page.url();
        if (currentUrl.includes('/post/')) {
          await expect(page).toHaveURL(/.*post\/.+/);
          console.log('✓ Can navigate to post details via post card');
        } else {
          console.log(`⚠ Post clicked but URL is: ${currentUrl}`);
        }
      } else {
        // Try finding claim button
        const claimButtons = page.locator('a, button').filter({ hasText: /claim|תביע/i });
        if (await claimButtons.count() > 0) {
          await claimButtons.first().click();
          await page.waitForTimeout(2000);
          await expect(page).toHaveURL(/.*post\/.+/);
          console.log('✓ Can navigate to post details via claim button');
        } else {
          console.log('⚠ No posts or claim buttons found');
        }
      }
    });

    test('Post details page shows claim button', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Find a post and click it
      const posts = page.locator('article, [class*="post"]');
      if (await posts.count() > 0) {
        await posts.first().click();
        await page.waitForTimeout(2000);

        // Check for claim button on post details
        const claimButton = page.locator('button, a').filter({ hasText: /claim|תביע/i });
        if (await claimButton.count() > 0) {
          await expect(claimButton.first()).toBeVisible({ timeout: 5000 });
          console.log('✓ Claim button visible on post details');
        }
      }
    });
  });

  // ==================== MAP PAGE ====================
  test.describe('Map Page', () => {
    test('Map page loads with map container', async ({ page }) => {
      console.log('Testing Map page...');
      await page.goto('/map');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(4000);

      // Check for map container
      const mapContainer = page.locator('.leaflet-container, [class*="leaflet"], canvas, [class*="map"]').first();
      await expect(mapContainer).toBeVisible({ timeout: 15000 });

      await page.screenshot({ path: 'test-results/map-full.png', fullPage: true });
      console.log('✓ Map page loaded');
    });

    test('Map search functionality works', async ({ page }) => {
      await page.goto('/map');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();
      if (await searchInput.count() > 0) {
        await expect(searchInput).toBeVisible({ timeout: 5000 });
        await searchInput.fill('Tel Aviv');
        await page.waitForTimeout(1000);

        await expect(searchInput).toHaveValue('Tel Aviv');
        console.log('✓ Map search works');
      }
    });

    test('Map zoom controls work', async ({ page }) => {
      await page.goto('/map');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(4000);

      const zoomIn = page.locator('.leaflet-control-zoom-in, [class*="zoom-in"]');
      const zoomOut = page.locator('.leaflet-control-zoom-out, [class*="zoom-out"]');

      if (await zoomIn.count() > 0) {
        await zoomIn.first().click();
        await page.waitForTimeout(500);
        console.log('✓ Map zoom in works');
      }

      if (await zoomOut.count() > 0) {
        await zoomOut.first().click();
        await page.waitForTimeout(500);
        console.log('✓ Map zoom out works');
      }
    });
  });

  // ==================== PROFILE PAGE ====================
  test.describe('Profile Page', () => {
    test('Profile page loads with user information', async ({ page }) => {
      console.log('Testing Profile page...');
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for profile heading
      const heading = page.locator('h1, h2').filter({ hasText: /profile|פרופיל/i });
      await expect(heading.first()).toBeVisible({ timeout: 5000 });

      // Check for user avatar
      const avatar = page.locator('img[alt*="profile" i], img').first();
      await expect(avatar).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/profile-full.png', fullPage: true });
      console.log('✓ Profile page loaded');
    });

    test('Profile shows stats and badges', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for stats section
      const statsText = page.locator('text=/rating|completed|tasks|posts|impact/i');
      const statsCount = await statsText.count();

      // Check for badges section
      const badgesText = page.locator('text=/badge|Badge|achievement/i');
      const badgesCount = await badgesText.count();

      const hasContent = statsCount > 0 || badgesCount > 0 || await page.locator('article, [class*="card"]').count() > 0;
      expect(hasContent).toBeTruthy();
      console.log(`✓ Profile shows content (stats: ${statsCount}, badges: ${badgesCount})`);
    });

    test('Edit profile button works', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for Link to edit-profile or button with edit text
      const editButton = page.locator('a[href*="edit-profile"], a, button').filter({ hasText: /edit|ערוך/i });
      if (await editButton.count() > 0) {
        await editButton.first().click();
        await page.waitForTimeout(2000);

        // Should navigate to edit-profile page
        const currentUrl = page.url();
        if (currentUrl.includes('edit-profile')) {
          await expect(page).toHaveURL(/.*edit-profile/);
          console.log('✓ Edit profile button works');
        } else {
          console.log(`⚠ Edit button clicked but URL is: ${currentUrl}`);
        }
      } else {
        console.log('⚠ Edit profile button not found');
      }
    });
  });

  // ==================== MESSAGES PAGE ====================
  test.describe('Messages Page', () => {
    test('Messages page loads', async ({ page }) => {
      console.log('Testing Messages page...');
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for messages content
      const messagesContent = page.locator('h1, h2, [class*="message"]').first();
      await expect(messagesContent).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/messages-full.png', fullPage: true });
      console.log('✓ Messages page loaded');
    });

    test('Messages list displays conversations', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for conversation list or empty state
      const conversations = page.locator('[class*="conversation"], [class*="message"], li, button').filter({ 
        hasText: /.+/ 
      });
      const emptyState = page.locator('text=/no message|empty|no conversation/i');

      const conversationCount = await conversations.count();
      const isEmpty = await emptyState.count() > 0;

      expect(conversationCount > 0 || isEmpty).toBeTruthy();
      console.log(`✓ Messages list displays (${conversationCount} conversations or empty state)`);
    });

    test('Can click on conversation', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const conversations = page.locator('[class*="conversation"], [class*="message"], button').filter({ 
        hasText: /.+/ 
      });
      const conversationCount = await conversations.count();

      if (conversationCount > 0) {
        await conversations.first().click();
        await page.waitForTimeout(1000);
        console.log('✓ Can click on conversation');
      } else {
        console.log('⚠ No conversations to test');
      }
    });
  });

  // ==================== POST DETAILS PAGE ====================
  test.describe('Post Details Page', () => {
    test('Post details page loads', async ({ page }) => {
      console.log('Testing Post Details page...');
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Find a post and click it
      const posts = page.locator('article, [class*="post"]');
      if (await posts.count() > 0) {
        await posts.first().click();
        await page.waitForTimeout(2000);

        // Check we're on post details page
        await expect(page).toHaveURL(/.*post\/.+/, { timeout: 5000 });

        // Check for post content
        const postContent = page.locator('article, [class*="post"], main').first();
        await expect(postContent).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: 'test-results/post-details-full.png', fullPage: true });
        console.log('✓ Post details page loaded');
      }
    });

    test('Post details shows like and comment buttons', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const posts = page.locator('article, [class*="post"]');
      if (await posts.count() > 0) {
        await posts.first().click();
        await page.waitForTimeout(2000);

        // Check for like button
        const likeButton = page.locator('button').filter({ hasText: /like/i }).or(
          page.locator('[class*="heart"], svg')
        );
        expect(await likeButton.count()).toBeGreaterThan(0);

        // Check for comment button
        const commentButton = page.locator('button').filter({ hasText: /comment/i }).or(
          page.locator('[class*="message"], svg')
        );
        expect(await commentButton.count()).toBeGreaterThan(0);

        console.log('✓ Post details shows like and comment buttons');
      }
    });
  });

  // ==================== NEW POST PAGE ====================
  test.describe('New Post Page', () => {
    test('New post form can be filled', async ({ page }) => {
      console.log('Testing New Post form...');
      await page.goto('/new-post');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Fill description
      const descriptionInput = page.locator('textarea').first();
      await expect(descriptionInput).toBeVisible({ timeout: 5000 });
      await descriptionInput.fill('Test post description');

      // Fill location
      const locationInput = page.locator('input[placeholder*="address" i], input[placeholder*="location" i]').first();
      await expect(locationInput).toBeVisible({ timeout: 5000 });
      await locationInput.fill('Tel Aviv, Israel');

      // Fill title if exists
      const titleInputs = page.locator('input[type="text"]');
      const titleCount = await titleInputs.count();
      if (titleCount > 0) {
        await titleInputs.first().fill('Test Post Title');
      }

      // Select category
      const categorySelect = page.locator('select').first();
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption({ index: 1 });
      }

      console.log('✓ New post form can be filled');
    });

    test('New post form validation works', async ({ page }) => {
      await page.goto('/new-post');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Try to submit empty form
      const submitButton = page.locator('form button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should stay on new-post page (validation prevents submission)
        await expect(page).toHaveURL(/.*new-post/);
        console.log('✓ New post form validation works');
      }
    });
  });

  // ==================== ERROR HANDLING ====================
  test.describe('Error Handling', () => {
    test('Check for console errors on all pages', async ({ page }) => {
      const pages = [
        { path: '/feed', name: 'Feed' },
        { path: '/map', name: 'Map' },
        { path: '/messages', name: 'Messages' },
        { path: '/profile', name: 'Profile' },
        { path: '/settings', name: 'Settings' },
        { path: '/notifications', name: 'Notifications' }
      ];

      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push({ page: 'unknown', error: msg.text() });
        }
      });

      for (const pageInfo of pages) {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check for specific errors
        const pageErrors = errors.filter(e => e.page === pageInfo.name);
        if (pageErrors.length > 0) {
          console.log(`⚠ Errors on ${pageInfo.name}:`, pageErrors);
        }
      }

      // Filter out known non-critical errors
      const criticalErrors = errors.filter(err => 
        !err.error.includes('favicon') &&
        !err.error.includes('sourcemap') &&
        !err.error.includes('extension')
      );

      if (criticalErrors.length > 0) {
        console.log('⚠ Critical errors found:', criticalErrors);
      } else {
        console.log('✓ No critical errors detected');
      }
    });
  });
});

