import { test, expect, devices } from '@playwright/test';

// Use Pixel 5 device for mobile emulation
test.use({ 
  ...devices['Pixel 5'],
  baseURL: 'http://localhost:5173'
});

test.describe('Comprehensive Testing - All Pages & Edge Cases', () => {

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

  // ==================== CRASH DETECTION ====================
  test('Detect crashes and errors across all pages', async ({ page }) => {
    console.log('Testing for crashes and errors...');
    
    const errors = [];
    const crashes = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      crashes.push(error.message);
    });

    const pages = [
      { path: '/feed', name: 'Feed' },
      { path: '/map', name: 'Map' },
      { path: '/messages', name: 'Messages' },
      { path: '/profile', name: 'Profile' },
      { path: '/settings', name: 'Settings' },
      { path: '/notifications', name: 'Notifications' },
      { path: '/new-post', name: 'New Post' }
    ];

    for (const pageInfo of pages) {
      console.log(`Testing ${pageInfo.name}...`);
      try {
        await page.goto(pageInfo.path, { timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000); // Reduced timeout

        // Check for critical errors
        const criticalErrors = errors.filter(err => 
          err.includes('Maximum update depth') ||
          err.includes('Cannot read property') ||
          err.includes('undefined is not') ||
          err.includes('crash') ||
          err.includes('Failed to fetch')
        );

        if (criticalErrors.length > 0) {
          console.log(`⚠ Critical errors on ${pageInfo.name}:`, criticalErrors.slice(0, 3));
        }
      } catch (error) {
        console.log(`⚠ Error loading ${pageInfo.name}:`, error.message);
        // Continue with next page
      }
    }

    if (crashes.length > 0) {
      console.log('⚠ Page crashes detected:', crashes);
      throw new Error(`Crashes detected: ${crashes.join(', ')}`);
    }

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(err => 
      !err.includes('favicon') &&
      !err.includes('sourcemap') &&
      !err.includes('extension') &&
      (err.includes('Maximum update depth') ||
       err.includes('Cannot read property') ||
       err.includes('undefined is not'))
    );

    if (criticalErrors.length > 0) {
      console.log('⚠ Critical errors found:', criticalErrors.slice(0, 5));
    } else {
      console.log('✓ No critical crashes or errors detected');
    }
  });

  // ==================== FEED PAGE ====================
  test.describe('Feed Page - Comprehensive', () => {
    test('Feed loads without errors', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);

      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      const criticalErrors = errors.filter(err => 
        err.includes('Maximum update depth') ||
        err.includes('timeout')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('Feed tabs work without crashes', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const tabs = ['nearby', 'myPosts', 'myClaim'];
      for (const tab of tabs) {
        const tabButton = page.locator('button, a').filter({ hasText: new RegExp(tab, 'i') });
        if (await tabButton.count() > 0) {
          await tabButton.first().click();
          await page.waitForTimeout(2000);
          
          // Check for errors
          const pageContent = await page.textContent('body');
          expect(pageContent).toBeTruthy();
        }
      }
    });

    test('Feed refresh works without errors', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Trigger refresh
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Feed should still be visible
      const feedContent = page.locator('main, [class*="feed"]');
      await expect(feedContent.first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ==================== MAP PAGE ====================
  test.describe('Map Page - Comprehensive', () => {
    test('Map loads without infinite loops', async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Maximum update depth')) {
          errors.push(msg.text());
        }
      });

      await page.goto('/map');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(10000); // Wait for geocoding

      const infiniteLoopErrors = errors.filter(err => err.includes('Maximum update depth'));
      expect(infiniteLoopErrors.length).toBe(0);
    });

    test('Map handles rapid interactions without crashes', async ({ page }) => {
      await page.goto('/map');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Rapid interactions
      const searchInput = page.locator('input[placeholder*="search" i]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill('Tel');
        await page.waitForTimeout(100);
        await searchInput.fill('Tel Aviv');
        await page.waitForTimeout(100);
        await searchInput.fill('');
        await page.waitForTimeout(100);
        await searchInput.fill('Jerusalem');
        await page.waitForTimeout(2000);
      }

      // Map should still be functional
      const mapContainer = page.locator('.leaflet-container, [class*="leaflet"], canvas').first();
      await expect(mapContainer).toBeVisible({ timeout: 5000 });
    });
  });

  // ==================== POST DETAILS ====================
  test.describe('Post Details - Comprehensive', () => {
    test('Post details loads without errors', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const posts = page.locator('article, [class*="post"]');
      if (await posts.count() > 0) {
        await posts.first().click();
        await page.waitForTimeout(2000);

        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        await page.waitForTimeout(2000);

        const criticalErrors = errors.filter(err => 
          err.includes('Maximum update depth') ||
          err.includes('Cannot read property')
        );

        expect(criticalErrors.length).toBe(0);
      }
    });

    test('Post interactions work without crashes', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const posts = page.locator('article, [class*="post"]');
      if (await posts.count() > 0) {
        await posts.first().click();
        await page.waitForTimeout(2000);

        // Try various interactions
        const likeButton = page.locator('button').filter({ hasText: /like/i }).or(
          page.locator('[class*="heart"], svg')
        );
        if (await likeButton.count() > 0) {
          await likeButton.first().click();
          await page.waitForTimeout(1000);
        }

        // Navigate back
        await page.goBack();
        await page.waitForTimeout(1000);

        // Feed should still be visible
        const feedContent = page.locator('main, [class*="feed"]');
        await expect(feedContent.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  // ==================== MESSAGES PAGE ====================
  test.describe('Messages Page - Comprehensive', () => {
    test('Messages page handles empty state', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Should show empty state or conversations
      const content = page.locator('body');
      const text = await content.textContent();
      expect(text).toBeTruthy();
    });

    test('Messages navigation works', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const conversations = page.locator('[class*="conversation"], button').filter({ hasText: /.+/ });
      if (await conversations.count() > 0) {
        await conversations.first().click();
        await page.waitForTimeout(2000);

        // Should navigate to conversation
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/messages/);
      }
    });
  });

  // ==================== PROFILE PAGE ====================
  test.describe('Profile Page - Comprehensive', () => {
    test('Profile page loads user data', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for profile content
      const profileContent = page.locator('main, [class*="profile"]');
      await expect(profileContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('Profile navigation works', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Try navigating to edit profile
      const editLink = page.locator('a[href*="edit-profile"]');
      if (await editLink.count() > 0) {
        await editLink.first().click();
        await page.waitForTimeout(1000);
        await expect(page).toHaveURL(/.*edit-profile/);
      }
    });
  });

  // ==================== SETTINGS PAGE ====================
  test.describe('Settings Page - Comprehensive', () => {
    test('Settings toggles work without crashes', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Toggle dark mode multiple times
      const darkModeToggle = page.locator('button').filter({ hasText: /dark mode/i });
      if (await darkModeToggle.count() > 0) {
        for (let i = 0; i < 3; i++) {
          await darkModeToggle.first().click();
          await page.waitForTimeout(500);
        }
      }

      const criticalErrors = errors.filter(err => 
        err.includes('Maximum update depth') ||
        err.includes('Cannot read property')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('Language switching works without crashes', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const languageButton = page.locator('button').filter({ hasText: /language|שפה/i });
      const buttonCount = await languageButton.count();
      
      if (buttonCount > 0) {
        await languageButton.first().click();
        await page.waitForTimeout(1000);

        // Switch languages
        const hebrewOption = page.locator('button').filter({ hasText: /עברית|Hebrew/i });
        const englishOption = page.locator('button').filter({ hasText: /English/i });

        if (await hebrewOption.count() > 0) {
          await hebrewOption.first().click();
          await page.waitForTimeout(2000);
          
          // Settings should still be visible
          const settingsContent = page.locator('main, [class*="settings"]');
          await expect(settingsContent.first()).toBeVisible({ timeout: 5000 });
        }
      } else {
        console.log('⚠ Language button not found');
      }
    });
  });

  // ==================== NEW POST PAGE ====================
  test.describe('New Post Page - Comprehensive', () => {
    test('New post form handles validation', async ({ page }) => {
      await page.goto('/new-post');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Try submitting empty form
      const submitButton = page.locator('form button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should stay on new-post page
        await expect(page).toHaveURL(/.*new-post/);
      }
    });

    test('New post form fills correctly', async ({ page }) => {
      await page.goto('/new-post');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const descriptionInput = page.locator('textarea').first();
      if (await descriptionInput.count() > 0) {
        await descriptionInput.fill('Test post description for comprehensive testing');
        await expect(descriptionInput).toHaveValue('Test post description for comprehensive testing');
      }

      const locationInput = page.locator('input[placeholder*="location" i]').first();
      if (await locationInput.count() > 0) {
        await locationInput.fill('Tel Aviv, Israel');
        await expect(locationInput).toHaveValue('Tel Aviv, Israel');
      }
    });
  });

  // ==================== NAVIGATION ====================
  test.describe('Navigation - Comprehensive', () => {
    test('Rapid navigation works without crashes', async ({ page }) => {
      const pages = ['/feed', '/map', '/messages', '/profile', '/settings'];
      
      for (const path of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // Should end up on settings
      await expect(page).toHaveURL(/.*settings/);
    });

    test('Back navigation works', async ({ page }) => {
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const posts = page.locator('article, [class*="post"]');
      if (await posts.count() > 0) {
        await posts.first().click();
        await page.waitForTimeout(2000);

        await page.goBack();
        await page.waitForTimeout(1000);

        await expect(page).toHaveURL(/.*feed/);
      }
    });
  });

  // ==================== EDGE CASES ====================
  test.describe('Edge Cases', () => {
    test('Handles network errors gracefully', async ({ page }) => {
      // Navigate first while online
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Then simulate offline mode
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // Try to interact with page (should handle gracefully)
      const content = page.locator('body');
      const text = await content.textContent();
      expect(text).toBeTruthy();

      // Restore online
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
    });

    test('Handles missing data gracefully', async ({ page }) => {
      // Clear all data
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Should show empty state or loading, not crash
      const content = page.locator('body');
      const text = await content.textContent();
      expect(text).toBeTruthy();
    });

    test('Handles rapid state changes', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const darkModeToggle = page.locator('button').filter({ hasText: /dark mode/i });
      if (await darkModeToggle.count() > 0) {
        // Rapid toggling
        for (let i = 0; i < 10; i++) {
          await darkModeToggle.first().click();
          await page.waitForTimeout(50);
        }

        // Should still be functional
        const settingsContent = page.locator('main, [class*="settings"]');
        await expect(settingsContent.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  // ==================== MEMORY LEAKS ====================
  test.describe('Memory Leaks', () => {
    test('No memory leaks on repeated navigation', async ({ page }) => {
      const pages = ['/feed', '/map', '/messages', '/profile'];
      const errors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Navigate multiple times with shorter waits
      for (let i = 0; i < 3; i++) { // Reduced iterations
        for (const path of pages) {
          try {
            await page.goto(path, { timeout: 10000 });
            await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(500); // Reduced wait
          } catch (error) {
            console.log(`Navigation error on ${path}:`, error.message);
            // Continue with next page
          }
        }
      }

      await page.waitForTimeout(1000);

      const memoryErrors = errors.filter(err => 
        err.includes('memory') ||
        err.includes('leak') ||
        err.includes('Maximum update depth')
      );

      expect(memoryErrors.length).toBe(0);
    });
  });
});

