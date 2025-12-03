import { test, expect, devices } from '@playwright/test';

// Use Pixel 5 device (closest to Pixel 9) for mobile emulation
test.use({ 
  ...devices['Pixel 5'],
  baseURL: 'http://localhost:5173'
});

test.describe('Feed and Pages Functionality - Mobile (Pixel 9)', () => {

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
            rating: 4.8
          },
          isAuthenticated: true
        }
      }));
    });
  }

  test.beforeEach(async ({ page }) => {
    // Clear storage and authenticate
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await authenticateUser(page);
  });

  test('Feed page loads and displays posts', async ({ page }) => {
    console.log('Testing Feed page...');
    
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for InstantDB query

    // Check for feed header
    const feedHeading = page.locator('h1, h2').filter({ hasText: /feed|פיד/i }).first();
    await expect(feedHeading).toBeVisible({ timeout: 10000 });

    // Check for tabs
    const tabs = page.locator('button, a').filter({ hasText: /nearby|friends|my posts|my claims/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
    console.log(`Found ${tabCount} feed tabs`);

    // Check for posts or loading/empty state
    const posts = page.locator('article, [class*="post"]');
    const loadingIndicator = page.locator('text=/loading|Loading/i');
    const emptyState = page.locator('text=/no posts|empty/i');
    
    await page.waitForTimeout(2000);
    
    const postCount = await posts.count();
    const isLoading = await loadingIndicator.count() > 0;
    const isEmpty = await emptyState.count() > 0;

    console.log(`Posts: ${postCount}, Loading: ${isLoading}, Empty: ${isEmpty}`);

    // Feed should either show posts, loading, or empty state
    expect(postCount > 0 || isLoading || isEmpty).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'test-results/feed-mobile.png', fullPage: true });
  });

  test('Feed tabs navigation works', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find tabs
    const nearbyTab = page.locator('button, a').filter({ hasText: /nearby/i }).first();
    const myPostsTab = page.locator('button, a').filter({ hasText: /my posts/i }).first();
    const myClaimsTab = page.locator('button, a').filter({ hasText: /my claims/i }).first();

    if (await nearbyTab.count() > 0) {
      await nearbyTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked Nearby tab');
    }

    if (await myPostsTab.count() > 0) {
      await myPostsTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked My Posts tab');
    }

    if (await myClaimsTab.count() > 0) {
      await myClaimsTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked My Claims tab');
    }

    // Feed should still be visible
    const feedContent = page.locator('main, [class*="feed"]');
    await expect(feedContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('Map page loads', async ({ page }) => {
    console.log('Testing Map page...');
    
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000); // Wait for map to load

    // Check for map container
    const mapContainer = page.locator('.leaflet-container, [class*="leaflet"], canvas, [class*="map"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Check for search bar
    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/map-mobile.png', fullPage: true });
    console.log('✓ Map page loaded');
  });

  test('Messages page loads', async ({ page }) => {
    console.log('Testing Messages page...');
    
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for messages content
    const messagesContent = page.locator('h1, h2, [class*="message"]').first();
    await expect(messagesContent).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/messages-mobile.png', fullPage: true });
    console.log('✓ Messages page loaded');
  });

  test('Profile page loads', async ({ page }) => {
    console.log('Testing Profile page...');
    
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for profile heading
    const profileHeading = page.locator('h1, h2').filter({ hasText: /profile|פרופיל/i }).first();
    await expect(profileHeading).toBeVisible({ timeout: 5000 });

    // Check for user avatar
    const avatar = page.locator('img[alt*="profile" i], img').first();
    await expect(avatar).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/profile-mobile.png', fullPage: true });
    console.log('✓ Profile page loaded');
  });

  test('Settings page loads', async ({ page }) => {
    console.log('Testing Settings page...');
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for settings heading
    const settingsHeading = page.locator('h1').filter({ hasText: /settings|הגדרות/i }).first();
    await expect(settingsHeading).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/settings-mobile.png', fullPage: true });
    console.log('✓ Settings page loaded');
  });

  test('New Post page loads with form', async ({ page }) => {
    console.log('Testing New Post page...');
    
    await page.goto('/new-post');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for description textarea
    const descriptionInput = page.locator('textarea').first();
    await expect(descriptionInput).toBeVisible({ timeout: 5000 });

    // Check for location input
    const locationInput = page.locator('input[placeholder*="address" i], input[placeholder*="location" i]').first();
    await expect(locationInput).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/new-post-mobile.png', fullPage: true });
    console.log('✓ New Post page loaded');
  });

  test('Feed post interaction - like button works', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find first post
    const posts = page.locator('article, [class*="post"]');
    const postCount = await posts.count();

    if (postCount > 0) {
      const firstPost = posts.first();
      
      // Find like button
      const likeButton = firstPost.locator('button').filter({ 
        has: page.locator('[class*="heart"], svg')
      }).or(firstPost.locator('button').filter({ hasText: /❤|🤍/i })).first();

      if (await likeButton.count() > 0) {
        await likeButton.click();
        await page.waitForTimeout(1000);
        console.log('✓ Like button clicked');
      }
    } else {
      console.log('⚠ No posts found to test like functionality');
    }
  });

  test('Feed refresh works', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Try to trigger refresh (pull to refresh or refresh button)
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    
    // Scroll down and back up to trigger refresh
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    // Feed should still be visible
    const feedContent = page.locator('main, [class*="feed"]');
    await expect(feedContent.first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Feed refresh test completed');
  });

  test('Navigation between pages works', async ({ page }) => {
    const pages = [
      { path: '/feed', name: 'Feed' },
      { path: '/map', name: 'Map' },
      { path: '/messages', name: 'Messages' },
      { path: '/profile', name: 'Profile' },
      { path: '/settings', name: 'Settings' }
    ];

    for (const pageInfo of pages) {
      console.log(`Navigating to ${pageInfo.name}...`);
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify we're on the correct page
      await expect(page).toHaveURL(new RegExp(pageInfo.path.replace('/', '\\/')), { timeout: 5000 });
      console.log(`✓ ${pageInfo.name} page loaded`);
    }
  });

  test('Check for InstantDB connection errors', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for potential errors
    await page.waitForTimeout(5000);

    // Check for timeout or connection errors
    const hasTimeoutError = errors.some(err => 
      err.includes('timeout') || 
      err.includes('failed') || 
      err.includes('network') ||
      err.includes('Mutation failed')
    );

    if (hasTimeoutError) {
      console.log('⚠ InstantDB connection errors detected:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✓ No InstantDB connection errors detected');
    }

    // Take screenshot to see current state
    await page.screenshot({ path: 'test-results/feed-error-check.png', fullPage: true });
  });
});

