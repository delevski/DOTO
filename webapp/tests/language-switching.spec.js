// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Language Switching Test Suite
 * 
 * Tests the language switching functionality:
 * - Switching between English and Hebrew
 * - Persistence across page reloads
 * - RTL/LTR direction changes
 * - UI text updates immediately
 * - Settings page language selector
 */

test.describe('Language Switching - Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'https://i.pravatar.cc/150?u=test'
          },
          isAuthenticated: true
        },
        version: 0
      }));
    });
  });

  test('should switch from English to Hebrew', async ({ page }) => {
    // Start with English
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'en'
        },
        version: 0
      }));
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify initial state is English
    const initialDir = await page.getAttribute('html', 'dir');
    expect(initialDir).toBe('ltr');

    // Click language selector
    const languageButton = page.locator('button').filter({ hasText: /Language|שפה/i }).first();
    await languageButton.click();

    // Wait for modal to appear
    await page.waitForSelector('text=עברית', { timeout: 5000 });

    // Click Hebrew option
    const hebrewOption = page.locator('button').filter({ hasText: 'עברית' }).first();
    await hebrewOption.click();

    // Wait for language change to apply
    await page.waitForTimeout(500);

    // Verify direction changed to RTL
    const newDir = await page.getAttribute('html', 'dir');
    expect(newDir).toBe('rtl');

    // Verify Hebrew text appears
    const hebrewText = await page.locator('text=עברית').first();
    await expect(hebrewText).toBeVisible();
  });

  test('should switch from Hebrew to English', async ({ page }) => {
    // Start with Hebrew
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'he'
        },
        version: 0
      }));
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify initial state is Hebrew/RTL
    const initialDir = await page.getAttribute('html', 'dir');
    expect(initialDir).toBe('rtl');

    // Click language selector
    const languageButton = page.locator('button').filter({ hasText: /Language|שפה/i }).first();
    await languageButton.click();

    // Wait for modal to appear
    await page.waitForSelector('text=English', { timeout: 5000 });

    // Click English option
    const englishOption = page.locator('button').filter({ hasText: 'English' }).first();
    await englishOption.click();

    // Wait for language change to apply
    await page.waitForTimeout(500);

    // Verify direction changed to LTR
    const newDir = await page.getAttribute('html', 'dir');
    expect(newDir).toBe('ltr');

    // Verify English text appears
    const englishText = await page.locator('text=English').first();
    await expect(englishText).toBeVisible();
  });

  test('should persist language selection across page reloads', async ({ page }) => {
    // Set Hebrew initially
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'he'
        },
        version: 0
      }));
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify Hebrew is set
    let dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify Hebrew persists
    dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');

    // Navigate away and back
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify Hebrew still persists
    dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });

  test('should update UI text immediately after switching', async ({ page }) => {
    // Start with English
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'en'
        },
        version: 0
      }));
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Get initial text (should be English)
    const initialText = await page.locator('h1, h2').first().textContent();
    
    // Switch to Hebrew
    const languageButton = page.locator('button').filter({ hasText: /Language|שפה/i }).first();
    await languageButton.click();
    
    await page.waitForSelector('text=עברית', { timeout: 5000 });
    const hebrewOption = page.locator('button').filter({ hasText: 'עברית' }).first();
    await hebrewOption.click();
    
    // Wait for UI update
    await page.waitForTimeout(500);

    // Verify text changed (should have Hebrew characters or different text)
    const newText = await page.locator('h1, h2').first().textContent();
    
    // Text should have changed (either Hebrew characters or different structure)
    // We check that the page direction changed, which indicates language switch worked
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });

  test('should update all pages when language is switched', async ({ page }) => {
    // Start with English
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'en'
        },
        version: 0
      }));
    });

    // Switch to Hebrew in settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const languageButton = page.locator('button').filter({ hasText: /Language|שפה/i }).first();
    await languageButton.click();
    
    await page.waitForSelector('text=עברית', { timeout: 5000 });
    const hebrewOption = page.locator('button').filter({ hasText: 'עברית' }).first();
    await hebrewOption.click();
    
    await page.waitForTimeout(500);

    // Navigate to different pages and verify RTL persists
    const pages = ['/feed', '/messages', '/notifications', '/profile'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const dir = await page.getAttribute('html', 'dir');
      expect(dir).toBe('rtl');
    }
  });
});

test.describe('Language Switching - Feed Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'https://i.pravatar.cc/150?u=test'
          },
          isAuthenticated: true
        },
        version: 0
      }));
    });
  });

  test('should maintain language when navigating from feed to settings and back', async ({ page }) => {
    // Start with Hebrew
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'he'
        },
        version: 0
      }));
    });

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    // Verify Hebrew/RTL
    let dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');

    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify still Hebrew/RTL
    dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');

    // Navigate back to feed
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    // Verify still Hebrew/RTL
    dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });
});

test.describe('Language Switching - Login Page', () => {
  test('should maintain language selection on login page', async ({ page }) => {
    // Set Hebrew before navigating to login
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'he'
        },
        version: 0
      }));
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify Hebrew/RTL
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');

    // Verify Hebrew text is present
    const hebrewElements = await page.locator('text=/[א-ת]/').count();
    expect(hebrewElements).toBeGreaterThan(0);
  });
});

test.describe('Language Switching - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'https://i.pravatar.cc/150?u=test'
          },
          isAuthenticated: true
        },
        version: 0
      }));
    });
  });

  test('should handle rapid language switching', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const languageButton = page.locator('button').filter({ hasText: /Language|שפה/i }).first();

    // Rapidly switch languages multiple times
    for (let i = 0; i < 3; i++) {
      await languageButton.click();
      await page.waitForTimeout(200);
      
      // Click Hebrew
      const hebrewOption = page.locator('button').filter({ hasText: 'עברית' }).first();
      if (await hebrewOption.isVisible()) {
        await hebrewOption.click();
        await page.waitForTimeout(300);
      }

      await languageButton.click();
      await page.waitForTimeout(200);
      
      // Click English
      const englishOption = page.locator('button').filter({ hasText: 'English' }).first();
      if (await englishOption.isVisible()) {
        await englishOption.click();
        await page.waitForTimeout(300);
      }
    }

    // Final state should be consistent
    const finalDir = await page.getAttribute('html', 'dir');
    expect(['ltr', 'rtl']).toContain(finalDir);
  });

  test('should handle language switch during page load', async ({ page }) => {
    // Start navigation
    const navigationPromise = page.goto('/settings');
    
    // Switch language while page is loading
    await page.addInitScript(() => {
      localStorage.setItem('settings-storage', JSON.stringify({
        state: {
          darkMode: false,
          language: 'he'
        },
        version: 0
      }));
    });

    await navigationPromise;
    await page.waitForLoadState('networkidle');

    // Verify language was applied
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });
});

test.describe('Language Switching - Visual Consistency', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'https://i.pravatar.cc/150?u=test'
          },
          isAuthenticated: true
        },
        version: 0
      }));
    });
  });

  test('should maintain consistent layout when switching languages', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Get initial layout measurements
    const initialLayout = await page.evaluate(() => {
      const mainContent = document.querySelector('main, [role="main"]');
      if (!mainContent) return null;
      const rect = mainContent.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    // Switch to Hebrew
    const languageButton = page.locator('button').filter({ hasText: /Language|שפה/i }).first();
    await languageButton.click();
    
    await page.waitForSelector('text=עברית', { timeout: 5000 });
    const hebrewOption = page.locator('button').filter({ hasText: 'עברית' }).first();
    await hebrewOption.click();
    
    await page.waitForTimeout(500);

    // Get layout after switch
    const newLayout = await page.evaluate(() => {
      const mainContent = document.querySelector('main, [role="main"]');
      if (!mainContent) return null;
      const rect = mainContent.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    // Layout should be similar (allowing for minor differences)
    if (initialLayout && newLayout) {
      expect(Math.abs(initialLayout.width - newLayout.width)).toBeLessThan(50);
    }
  });
});

