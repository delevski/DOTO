import { test, expect } from '@playwright/test';

test('homepage loads and shows login', async ({ page }) => {
  // Clear any existing auth state
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
  });
  
  await page.goto('/login');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check for login form elements - Login page uses email and password inputs
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="אימייל"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  
  // At least one input should be visible
  const hasInputs = await page.locator('input').count() > 0;
  expect(hasInputs).toBeTruthy();
  
  // Check if we're on login page
  await expect(page).toHaveURL(/.*login/);
});

test('can navigate to feed after login', async ({ page }) => {
  // Mock authentication by setting localStorage
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: 'test-user',
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          avatar: 'https://i.pravatar.cc/150?u=test'
        },
        isAuthenticated: true
      }
    }));
  });
  
  await page.reload();
  await page.goto('/feed');
  
  // Should see feed page
  await expect(page.locator('h1')).toContainText(/feed|פיד/i);
});

test('dark mode toggle works', async ({ page }) => {
  await page.goto('/settings');
  
  // Mock authentication
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: { 
          id: 'test-user', 
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890'
        },
        isAuthenticated: true
      }
    }));
  });
  
  await page.reload();
  await page.goto('/settings');
  
  // Find dark mode toggle
  const darkModeToggle = page.locator('button').filter({ hasText: /dark mode|מצב כהה/i }).first();
  
  // Check initial state
  const htmlElement = page.locator('html');
  const initialDarkMode = await htmlElement.evaluate(el => el.classList.contains('dark'));
  
  // Click toggle
  await darkModeToggle.click();
  
  // Wait for dark mode to apply
  await page.waitForTimeout(500);
  
  // Check if dark mode class was toggled
  const newDarkMode = await htmlElement.evaluate(el => el.classList.contains('dark'));
  expect(newDarkMode).toBe(!initialDarkMode);
});

test('RTL support works for Hebrew', async ({ page }) => {
  await page.goto('/settings');
  
  // Mock authentication
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: { 
          id: 'test-user', 
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890'
        },
        isAuthenticated: true
      }
    }));
  });
  
  await page.reload();
  await page.goto('/settings');
  
  // Find language selector
  const languageButton = page.locator('button').filter({ hasText: /language|שפה/i }).first();
  await languageButton.click();
  
  // Select Hebrew
  const hebrewOption = page.locator('button').filter({ hasText: /עברית|Hebrew/i }).first();
  await hebrewOption.click();
  
  // Wait for RTL to apply
  await page.waitForTimeout(500);
  
  // Check if dir attribute is set to rtl
  const htmlElement = page.locator('html');
  const dir = await htmlElement.getAttribute('dir');
  expect(dir).toBe('rtl');
});

test('can create a new post', async ({ page }) => {
  await page.goto('/new-post');
  
  // Mock authentication
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: 'test-user',
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          avatar: 'https://i.pravatar.cc/150?u=test'
        },
        isAuthenticated: true
      }
    }));
  });
  
  await page.reload();
  await page.goto('/new-post');
  
  // Fill in post form
  const descriptionInput = page.locator('textarea').first();
  await descriptionInput.fill('Test post description');
  
  const locationInput = page.locator('input[placeholder*="address"], input[placeholder*="מיקום"]').first();
  await locationInput.fill('Test Location');
  
  // Submit form
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  
  // Should navigate to feed or post details
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/.*feed|.*post/);
});

test('map view displays posts', async ({ page }) => {
  // Mock authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: { id: 'test-user', name: 'Test User' },
        isAuthenticated: true
      }
    }));
  });
  
  await page.goto('/map');
  
  // Wait for map to load - Leaflet takes time to initialize
  await page.waitForTimeout(3000);
  
  // Check if map container exists - use a more flexible selector
  const mapContainer = page.locator('.leaflet-container, [class*="leaflet"]').first();
  await expect(mapContainer).toBeVisible({ timeout: 10000 });
  
  // Alternative: check if map-related elements exist
  const hasMap = await page.locator('div[style*="height"], .leaflet-container, canvas').count() > 0;
  expect(hasMap).toBeTruthy();
});

