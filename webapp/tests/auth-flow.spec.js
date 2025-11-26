import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login requires phone and email', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check for phone input
    const phoneInput = page.locator('input[type="tel"]').first();
    await expect(phoneInput).toBeVisible();
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Should show validation error or stay on page
    await expect(page).toHaveURL(/.*login/);
  });

  test('login form accepts phone and email', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill in phone and email
    const phoneInput = page.locator('input[type="tel"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    
    await phoneInput.fill('+1234567890');
    await emailInput.fill('test@example.com');
    
    // Verify values are set
    expect(await phoneInput.inputValue()).toBe('+1234567890');
    expect(await emailInput.inputValue()).toBe('test@example.com');
    
    // Submit form
    await page.locator('button[type="submit"]').first().click();
    
    // Wait a moment for any navigation or state change
    await page.waitForTimeout(1000);
    
    // After submission, should either show verification code screen or navigate
    // Check that we're still on login page (verification screen) or moved to register
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login|register/);
  });

  test('registration form includes email field', async ({ page }) => {
    // Set up session storage as if user completed verification
    await page.goto('/register');
    await page.evaluate(() => {
      sessionStorage.setItem('phone', '+1234567890');
      sessionStorage.setItem('email', 'test@example.com');
      sessionStorage.setItem('verification_code', '123456');
    });
    
    await page.reload();
    await page.goto('/register');
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Email should be pre-filled
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('test@example.com');
    
    // Check for other required fields
    await expect(page.locator('input[name="name"]').first()).toBeVisible();
    await expect(page.locator('input[name="age"]').first()).toBeVisible();
    await expect(page.locator('input[name="location"]').first()).toBeVisible();
  });

  test('logout functionality works', async ({ page }) => {
    // Mock authentication
    await page.goto('/feed');
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
    
    // Navigate to settings
    await page.getByRole('link', { name: /settings|הגדרות/i }).click();
    await expect(page).toHaveURL(/.*settings/);
    
    // Find and click logout button
    const logoutButton = page.locator('button').filter({ hasText: /log out|התנתק/i }).first();
    await logoutButton.click();
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // Check that auth state is cleared
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    
    expect(authState?.state?.isAuthenticated).toBeFalsy();
  });
});

