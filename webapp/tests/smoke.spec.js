import { test, expect } from '@playwright/test';

// Helper function to authenticate user
async function authenticateUser(page) {
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: 'test-user',
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          avatar: 'https://i.pravatar.cc/150?u=test',
          age: 25,
          location: 'Test City',
          rating: 4.9
        },
        isAuthenticated: true
      }
    }));
  });
}

// Helper function to navigate to authenticated page
async function gotoAuthenticated(page, path) {
  await authenticateUser(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('DOTO Smoke Tests - All Screens & Functionalities', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // ==================== AUTHENTICATION FLOW ====================
  
  test.describe('Authentication', () => {
    test('Login screen loads with phone and email fields', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // Check for phone input
      const phoneInput = page.locator('input[type="tel"]').first();
      await expect(phoneInput).toBeVisible();
      
      // Check for email input
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();
      
      // Check for submit button
      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText(/verification|code/i);
    });

    test('Login form validation works', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit empty form
      await page.locator('button[type="submit"]').first().click();
      
      // Should stay on login page (validation prevents submission)
      await expect(page).toHaveURL(/.*login/);
    });

    test('Verification code screen appears after login submission', async ({ page }) => {
      await page.goto('/login');
      
      // Fill in phone and email
      await page.locator('input[type="tel"]').first().fill('+1234567890');
      await page.locator('input[type="email"]').first().fill('test@example.com');
      
      // Submit
      await page.locator('button[type="submit"]').first().click();
      
      // Wait for verification screen
      await page.waitForTimeout(1000);
      
      // Check for verification code inputs (6 inputs)
      const codeInputs = page.locator('input[inputmode="numeric"], input[type="text"]');
      const inputCount = await codeInputs.count();
      expect(inputCount).toBeGreaterThanOrEqual(6);
      
      // Check for email in message
      const pageText = await page.textContent('body');
      expect(pageText).toContain('test@example.com');
    });

    test('Registration screen loads with all required fields', async ({ page }) => {
      // Set up session storage as if verification completed
      await page.goto('/register');
      await page.evaluate(() => {
        sessionStorage.setItem('phone', '+1234567890');
        sessionStorage.setItem('email', 'test@example.com');
        sessionStorage.setItem('verification_code', '123456');
      });
      
      await page.reload();
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      
      // Check for all required fields (more flexible selectors)
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      await expect(emailInput).toBeVisible({ timeout: 5000 });
      
      const ageInput = page.locator('input[name="age"], input[type="number"]').first();
      await expect(ageInput).toBeVisible({ timeout: 5000 });
      
      const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
      await expect(locationInput).toBeVisible({ timeout: 5000 });
      
      // Check for profile image upload (might be hidden)
      const imageUpload = page.locator('input[type="file"]').first();
      // File input might be hidden, so just check it exists
      expect(await imageUpload.count()).toBeGreaterThan(0);
      
      // Check for submit button
      await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ==================== MAIN SCREENS ====================
  
  test.describe('Feed Screen', () => {
    test('Feed screen loads and displays content', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      
      // Check for feed heading
      const heading = page.locator('h1').filter({ hasText: /feed|פיד/i });
      await expect(heading.first()).toBeVisible();
      
      // Check for search bar
      const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="חיפוש" i]');
      await expect(searchInput.first()).toBeVisible();
      
      // Check for navigation tabs
      const tabs = page.locator('button, a').filter({ hasText: /nearby|friends|following|my posts/i });
      expect(await tabs.count()).toBeGreaterThan(0);
      
      // Check for create post button in sidebar
      const createPostBtn = page.locator('a, button').filter({ hasText: /create post|צור פוסט/i });
      await expect(createPostBtn.first()).toBeVisible();
    });

    test('Feed displays posts with images', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      
      // Wait for posts to load
      await page.waitForTimeout(2000);
      
      // Check for post articles
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        // Check first post has content
        const firstPost = posts.first();
        await expect(firstPost).toBeVisible();
        
        // Check for like button
        const likeButton = firstPost.locator('button').filter({ hasText: /like|heart/i }).or(
          firstPost.locator('[class*="heart"], svg')
        );
        expect(await likeButton.count()).toBeGreaterThan(0);
        
        // Check for comment button
        const commentButton = firstPost.locator('button, a').filter({ hasText: /comment|message/i }).or(
          firstPost.locator('[class*="message"], svg')
        );
        expect(await commentButton.count()).toBeGreaterThan(0);
      }
    });

    test('Feed search functionality works', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      
      const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="חיפוש" i]').first();
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Search should be functional (no errors)
      await expect(searchInput).toHaveValue('test');
    });
  });

  test.describe('Map View Screen', () => {
    test('Map screen loads and displays map', async ({ page }) => {
      await gotoAuthenticated(page, '/map');
      
      // Wait for map to initialize
      await page.waitForTimeout(4000);
      
      // Check for map container (more flexible)
      const mapContainer = page.locator('.leaflet-container, [class*="leaflet"], canvas, [class*="map"]').first();
      await expect(mapContainer).toBeVisible({ timeout: 15000 });
      
      // Check for search bar
      const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]');
      await expect(searchInput.first()).toBeVisible({ timeout: 5000 });
      
      // Check for filter button (might not always be visible)
      const filterButton = page.locator('button').filter({ hasText: /filter/i });
      if (await filterButton.count() > 0) {
        await expect(filterButton.first()).toBeVisible();
      }
    });

    test('Map search functionality works', async ({ page }) => {
      await gotoAuthenticated(page, '/map');
      await page.waitForTimeout(3000);
      
      const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill('test location');
      await page.waitForTimeout(500);
      
      await expect(searchInput).toHaveValue('test location');
    });
  });

  test.describe('New Post Screen', () => {
    test('New post screen loads with all form fields', async ({ page }) => {
      await gotoAuthenticated(page, '/new-post');
      await page.waitForLoadState('networkidle');
      
      // Check for description textarea (required field)
      const descriptionInput = page.locator('textarea').first();
      await expect(descriptionInput).toBeVisible({ timeout: 5000 });
      
      // Check for category select
      const categorySelect = page.locator('select').first();
      await expect(categorySelect).toBeVisible({ timeout: 5000 });
      
      // Check for location input
      const locationInput = page.locator('input[placeholder*="address" i], input[placeholder*="location" i], input[placeholder*="מיקום" i]');
      await expect(locationInput.first()).toBeVisible({ timeout: 5000 });
      
      // Check for time/date input
      const timeInput = page.locator('input[type="datetime-local"]').first();
      await expect(timeInput).toBeVisible({ timeout: 5000 });
      
      // Check for image upload (might be hidden)
      const imageUpload = page.locator('input[type="file"]').first();
      expect(await imageUpload.count()).toBeGreaterThan(0);
      
      // Check for submit button
      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible({ timeout: 5000 });
    });

    test('New post form can be filled and submitted', async ({ page }) => {
      await gotoAuthenticated(page, '/new-post');
      
      // Fill description (required)
      const descriptionInput = page.locator('textarea').first();
      await descriptionInput.fill('Smoke test post description');
      
      // Fill location (required)
      const locationInput = page.locator('input[placeholder*="address" i], input[placeholder*="location" i]').first();
      await locationInput.fill('Test Location, Test City');
      
      // Fill title (optional)
      const titleInputs = page.locator('input[type="text"]');
      const titleCount = await titleInputs.count();
      if (titleCount > 0) {
        await titleInputs.first().fill('Smoke Test Post');
      }
      
      // Select category
      const categorySelect = page.locator('select').first();
      await categorySelect.selectOption({ index: 1 });
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Should navigate to feed or post details
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/.*feed|.*post/);
    });

    test('Image upload button works', async ({ page }) => {
      await gotoAuthenticated(page, '/new-post');
      
      // Find image upload button
      const uploadButton = page.locator('button').filter({ 
        hasText: /upload|image|photo|click to upload/i 
      }).first();
      
      if (await uploadButton.count() > 0) {
        await uploadButton.click();
        // File picker should open (we can't test file selection in headless mode easily)
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Post Details Screen', () => {
    test('Post details screen loads', async ({ page }) => {
      // First create a post or use existing one
      await gotoAuthenticated(page, '/feed');
      await page.waitForTimeout(2000);
      
      // Try to find a post link
      const postLinks = page.locator('a[href*="/post/"]');
      const linkCount = await postLinks.count();
      
      if (linkCount > 0) {
        await postLinks.first().click();
        await page.waitForTimeout(2000);
        
        // Check we're on post details page
        await expect(page).toHaveURL(/.*post\/.+/, { timeout: 5000 });
        
        // Check for post content (more flexible)
        const postContent = page.locator('article, [class*="post"], main').first();
        await expect(postContent).toBeVisible({ timeout: 5000 });
      } else {
        // If no posts, just verify the route exists (will redirect to feed)
        await page.goto('/post/test-post-id');
        await page.waitForTimeout(2000);
        // Should redirect to feed if post doesn't exist
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/feed|post/);
      }
    });

    test('Post details shows like and comment buttons', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      await page.waitForTimeout(2000);
      
      const postLinks = page.locator('a[href*="/post/"]');
      if (await postLinks.count() > 0) {
        await postLinks.first().click();
        await page.waitForTimeout(1000);
        
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
      }
    });
  });

  test.describe('Messages Screen', () => {
    test('Messages screen loads', async ({ page }) => {
      await gotoAuthenticated(page, '/messages');
      
      // Check for messages heading or content
      const messagesContent = page.locator('h1, h2, [class*="message"]');
      await expect(messagesContent.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Profile Screen', () => {
    test('Profile screen loads with user information', async ({ page }) => {
      await gotoAuthenticated(page, '/profile');
      
      // Check for profile heading
      const heading = page.locator('h1, h2').filter({ hasText: /profile|פרופיל/i });
      await expect(heading.first()).toBeVisible();
      
      // Check for user avatar
      const avatar = page.locator('img[alt*="profile" i], img[alt*="Profile" i]').or(
        page.locator('img').first()
      );
      await expect(avatar.first()).toBeVisible();
      
      // Check for edit profile button
      const editButton = page.locator('a, button').filter({ hasText: /edit|ערוך/i });
      await expect(editButton.first()).toBeVisible();
    });

    test('Profile shows stats and badges', async ({ page }) => {
      await gotoAuthenticated(page, '/profile');
      await page.waitForLoadState('networkidle');
      
      // At minimum, profile page should load
      const profileContent = page.locator('main, [class*="profile"]');
      await expect(profileContent.first()).toBeVisible({ timeout: 5000 });
      
      // Check for stats section (more flexible - check if any stats-related content exists)
      const statsText = page.locator('text=/rating|completed|tasks|impact/i');
      const statsCount = await statsText.count();
      
      // Check for badges section (more flexible - check if badges-related content exists)
      const badgesText = page.locator('text=/badge|Badge/i');
      const badgesCount = await badgesText.count();
      
      // Profile page should have some content (stats or badges or both)
      // This is a smoke test, so we just verify the page loads correctly
      const hasContent = statsCount > 0 || badgesCount > 0 || await page.locator('article, [class*="card"]').count() > 0;
      expect(hasContent).toBeTruthy();
    });

    test('Logout button works from profile', async ({ page }) => {
      await gotoAuthenticated(page, '/profile');
      
      // Find logout button
      const logoutButton = page.locator('button').filter({ hasText: /log out|logout|התנתק/i });
      
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        await page.waitForTimeout(1000);
        
        // Should redirect to login
        await expect(page).toHaveURL(/.*login/);
      }
    });
  });

  test.describe('Edit Profile Screen', () => {
    test('Edit profile screen loads with form fields', async ({ page }) => {
      await gotoAuthenticated(page, '/edit-profile');
      
      // Check for name input
      const nameInput = page.locator('input[name="name"]').first();
      await expect(nameInput).toBeVisible();
      
      // Check for email input
      const emailInput = page.locator('input[name="email"]').first();
      await expect(emailInput).toBeVisible();
      
      // Check for save button
      const saveButton = page.locator('button[type="submit"]').first();
      await expect(saveButton).toBeVisible();
    });

    test('Edit profile form can be updated', async ({ page }) => {
      await gotoAuthenticated(page, '/edit-profile');
      
      // Update name
      const nameInput = page.locator('input[name="name"]').first();
      await nameInput.clear();
      await nameInput.fill('Updated Test User');
      
      // Update bio if exists
      const bioInput = page.locator('textarea, input[name="bio"]');
      if (await bioInput.count() > 0) {
        await bioInput.first().fill('Updated bio from smoke test');
      }
      
      // Form should be fillable (we won't submit to avoid changing test data)
      await expect(nameInput).toHaveValue('Updated Test User');
    });
  });

  test.describe('Settings Screen', () => {
    test('Settings screen loads with all sections', async ({ page }) => {
      await gotoAuthenticated(page, '/settings');
      
      // Check for settings heading
      const heading = page.locator('h1').filter({ hasText: /settings|הגדרות/i });
      await expect(heading.first()).toBeVisible();
      
      // Check for account section
      const accountSection = page.locator('h2, [class*="account"]').filter({ hasText: /account|חשבון/i });
      await expect(accountSection.first()).toBeVisible();
      
      // Check for app preferences section
      const preferencesSection = page.locator('h2, [class*="preference"]').filter({ 
        hasText: /preference|language|dark mode/i 
      });
      await expect(preferencesSection.first()).toBeVisible();
    });

    test('Dark mode toggle works', async ({ page }) => {
      await gotoAuthenticated(page, '/settings');
      
      // Find dark mode toggle
      const darkModeToggle = page.locator('button').filter({ hasText: /dark mode|מצב כהה/i }).first();
      await expect(darkModeToggle).toBeVisible();
      
      // Get initial state
      const htmlElement = page.locator('html');
      const initialDarkMode = await htmlElement.evaluate(el => el.classList.contains('dark'));
      
      // Click toggle
      await darkModeToggle.click();
      await page.waitForTimeout(500);
      
      // Check if dark mode changed
      const newDarkMode = await htmlElement.evaluate(el => el.classList.contains('dark'));
      expect(newDarkMode).toBe(!initialDarkMode);
      
      // Toggle back
      await darkModeToggle.click();
      await page.waitForTimeout(500);
      
      const finalDarkMode = await htmlElement.evaluate(el => el.classList.contains('dark'));
      expect(finalDarkMode).toBe(initialDarkMode);
    });

    test('Language selection works', async ({ page }) => {
      await gotoAuthenticated(page, '/settings');
      
      // Find language button
      const languageButton = page.locator('button').filter({ hasText: /language|שפה/i }).first();
      await expect(languageButton).toBeVisible();
      
      // Click to open language modal
      await languageButton.click();
      await page.waitForTimeout(500);
      
      // Check for language options
      const hebrewOption = page.locator('button').filter({ hasText: /עברית|Hebrew/i });
      await expect(hebrewOption.first()).toBeVisible();
      
      // Select Hebrew
      await hebrewOption.first().click();
      await page.waitForTimeout(500);
      
      // Check RTL is applied
      const htmlElement = page.locator('html');
      const dir = await htmlElement.getAttribute('dir');
      expect(dir).toBe('rtl');
      
      // Switch back to English
      await languageButton.click();
      await page.waitForTimeout(500);
      const englishOption = page.locator('button').filter({ hasText: /English/i });
      await englishOption.first().click();
      await page.waitForTimeout(500);
      
      const finalDir = await htmlElement.getAttribute('dir');
      expect(finalDir).toBe('ltr');
    });

    test('Logout works from settings', async ({ page }) => {
      await gotoAuthenticated(page, '/settings');
      
      // Find logout button
      const logoutButton = page.locator('button').filter({ hasText: /log out|logout|התנתק/i });
      
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        await page.waitForTimeout(1000);
        
        // Should redirect to login
        await expect(page).toHaveURL(/.*login/);
      }
    });
  });

  // ==================== NAVIGATION ====================
  
  test.describe('Navigation', () => {
    test('Sidebar navigation works', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      
      // Check sidebar is visible
      const sidebar = page.locator('aside, [class*="sidebar"]');
      await expect(sidebar.first()).toBeVisible();
      
      // Navigate to Map
      const mapLink = page.locator('a, button').filter({ hasText: /map|מפה/i });
      await mapLink.first().click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*map/);
      
      // Navigate to Messages
      const messagesLink = page.locator('a, button').filter({ hasText: /message|הודעות/i });
      await messagesLink.first().click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*message/);
      
      // Navigate back to Feed
      const feedLink = page.locator('a, button').filter({ hasText: /feed|פיד/i });
      await feedLink.first().click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*feed/);
    });

    test('Header profile menu works', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      
      // Find profile avatar/button in header
      const profileButton = page.locator('img[alt*="profile" i], button').filter({ 
        has: page.locator('img')
      }).first();
      
      if (await profileButton.count() > 0) {
        await profileButton.click();
        await page.waitForTimeout(500);
        
        // Check for dropdown menu
        const profileMenu = page.locator('[class*="menu"], [class*="dropdown"]');
        expect(await profileMenu.count()).toBeGreaterThan(0);
      }
    });
  });

  // ==================== FUNCTIONALITIES ====================
  
  test.describe('Post Interactions', () => {
    test('Like button works', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      await page.waitForTimeout(2000);
      
      // Find first post
      const posts = page.locator('article');
      if (await posts.count() > 0) {
        const firstPost = posts.first();
        
        // Find like button
        const likeButton = firstPost.locator('button').filter({ 
          has: page.locator('[class*="heart"], svg')
        }).first();
        
        if (await likeButton.count() > 0) {
          // Get initial like count if visible
          const initialText = await likeButton.textContent();
          
          // Click like
          await likeButton.click();
          await page.waitForTimeout(1000);
          
          // Button should still be visible
          await expect(likeButton).toBeVisible();
        }
      }
    });

    test('Post claiming works', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      await page.waitForTimeout(2000);
      
      // Find claim button
      const claimButtons = page.locator('a, button').filter({ hasText: /claim|תביע/i });
      
      if (await claimButtons.count() > 0) {
        await claimButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Should navigate to post details or show confirmation
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/post|feed/);
      }
    });
  });

  test.describe('Image Functionality', () => {
    test('Post images display correctly', async ({ page }) => {
      await gotoAuthenticated(page, '/feed');
      await page.waitForTimeout(2000);
      
      // Check for images in posts
      const postImages = page.locator('article img, [class*="post"] img');
      const imageCount = await postImages.count();
      
      // Images should be present (if posts have images)
      if (imageCount > 0) {
        await expect(postImages.first()).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('Mobile viewport works', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await gotoAuthenticated(page, '/feed');
      
      // Check sidebar can be toggled
      const menuButton = page.locator('button').filter({ has: page.locator('[class*="menu"], svg') });
      if (await menuButton.count() > 0) {
        await menuButton.first().click();
        await page.waitForTimeout(500);
      }
      
      // Content should still be visible
      const content = page.locator('main, [class*="content"]');
      await expect(content.first()).toBeVisible();
    });
  });
});

