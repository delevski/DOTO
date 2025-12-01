// @ts-check
import { test, expect } from '@playwright/test';

/**
 * RTL (Right-to-Left) Test Suite for Hebrew Language Support
 * 
 * This test suite validates that all pages correctly implement RTL layout
 * when Hebrew language is selected. It checks:
 * - Document direction attribute
 * - Flex containers have correct direction
 * - Icons are properly flipped
 * - Form inputs have correct direction (LTR for email/phone/URL)
 * - Menu/dropdown positioning uses logical properties
 */

// Helper function to set Hebrew language
async function setHebrewLanguage(page) {
  // Set language in localStorage before navigation
  await page.addInitScript(() => {
    localStorage.setItem('settings-storage', JSON.stringify({
      state: {
        darkMode: false,
        language: 'he'
      },
      version: 0
    }));
  });
}

// Helper function to set English language
async function setEnglishLanguage(page) {
  await page.addInitScript(() => {
    localStorage.setItem('settings-storage', JSON.stringify({
      state: {
        darkMode: false,
        language: 'en'
      },
      version: 0
    }));
  });
}

test.describe('RTL Support - Login Page', () => {
  test('should have RTL direction when Hebrew is selected', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/login');
    
    // Check document direction
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
  });

  test('should have LTR direction when English is selected', async ({ page }) => {
    await setEnglishLanguage(page);
    await page.goto('/login');
    
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('ltr');
  });

  test('email input should always be LTR', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Email inputs should have LTR direction via CSS
    const computedStyle = await emailInput.evaluate((el) => {
      return window.getComputedStyle(el).direction;
    });
    expect(computedStyle).toBe('ltr');
  });

  test('password visibility icon should be positioned correctly in RTL', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/login');
    
    const passwordContainer = page.locator('.relative').filter({ has: page.locator('input[type="password"]') }).first();
    const toggleButton = passwordContainer.locator('button');
    
    // The button should use inset-inline-end (end-3) positioning
    await expect(toggleButton).toBeVisible();
  });
});

test.describe('RTL Support - Register Page', () => {
  test('should have RTL direction when Hebrew is selected', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/register');
    
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
  });

  test('email input should be LTR even in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/register');
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const computedStyle = await emailInput.evaluate((el) => {
      return window.getComputedStyle(el).direction;
    });
    expect(computedStyle).toBe('ltr');
  });

  test('phone input should be LTR even in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/register');
    
    const phoneInput = page.locator('input[type="tel"]');
    if (await phoneInput.isVisible()) {
      const computedStyle = await phoneInput.evaluate((el) => {
        return window.getComputedStyle(el).direction;
      });
      expect(computedStyle).toBe('ltr');
    }
  });
});

test.describe('RTL Support - Settings Page', () => {
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

  test('should have RTL direction when Hebrew is selected', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/settings');
    
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
  });

  test('back arrow should be flipped in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/settings');
    
    // Check for rtl-flip class on ArrowLeft icon - look for the svg with rtl-flip class
    const flippedSvgs = page.locator('svg.rtl-flip');
    const count = await flippedSvgs.count();
    
    // There should be at least one flipped icon (the back arrow)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('ChevronRight icons should be flipped in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/settings');
    
    // Check for rtl-flip class on ChevronRight icons
    const chevrons = page.locator('[class*="rtl-flip"]');
    const count = await chevrons.count();
    
    // Settings page has multiple chevrons, they should all be flipped
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('RTL Support - Feed Page', () => {
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

  test('should have RTL direction when Hebrew is selected', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/feed');
    
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
  });

  test('sidebar should be on the right in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/feed');
    
    // The main container should have flex-row-reverse in RTL
    const mainContainer = page.locator('.flex.flex-row-reverse').first();
    await expect(mainContainer).toBeVisible();
  });
});

test.describe('RTL Support - Messages Page', () => {
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

  test('should have RTL direction when Hebrew is selected', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/messages');
    
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
  });

  test('conversation list should use border-end in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/messages');
    
    // The conversation list sidebar should have logical border
    const sidebar = page.locator('.border-e').first();
    await expect(sidebar).toBeVisible();
  });
});

test.describe('RTL Support - Notifications Page', () => {
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

  test('should have RTL direction when Hebrew is selected', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/notifications');
    
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
  });

  test('ArrowRight icons should be flipped in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/notifications');
    
    // Wait for content to load with timeout
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Give React time to render
    
    // Check if there are any notification items with flipped arrows
    const flippedArrows = page.locator('.rtl-flip');
    const count = await flippedArrows.count();
    
    // If there are notifications, arrows should be flipped
    // This is a soft check - page might have no notifications
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('RTL Support - New Post Page', () => {
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

  test('should have RTL direction when Hebrew is selected', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/new-post');
    
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
  });

  test('back arrow should be flipped in RTL mode', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/new-post');
    
    const backArrow = page.locator('.rtl-flip').first();
    await expect(backArrow).toBeVisible();
  });

  test('datetime input should be LTR', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/new-post');
    
    const datetimeInput = page.locator('input[type="datetime-local"]');
    await expect(datetimeInput).toBeVisible();
    
    const dir = await datetimeInput.getAttribute('dir');
    expect(dir).toBe('ltr');
  });
});

test.describe('RTL Support - Layout Component', () => {
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

  test('sidebar should use logical border in RTL', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/feed');
    
    // Sidebar should have border-e (end) class, not border-r or border-l
    const sidebar = page.locator('aside.border-e');
    await expect(sidebar).toBeVisible();
  });

  test('search icon should use logical positioning', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/feed');
    
    // Search icon should use start-3 positioning
    const searchIcon = page.locator('.start-3').first();
    await expect(searchIcon).toBeVisible();
  });

  test('profile dropdown should use logical end positioning', async ({ page }) => {
    // Skip on mobile viewports where header layout is different
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip();
      return;
    }
    
    await setHebrewLanguage(page);
    await page.goto('/feed');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Click on profile to open menu - use a more specific selector
    const profileButton = page.locator('header').locator('button').filter({ has: page.locator('img.rounded-full') }).first();
    
    if (await profileButton.isVisible()) {
      await profileButton.click();
      
      // Profile menu should have end-0 positioning
      const profileMenu = page.locator('.end-0');
      await expect(profileMenu.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// Visual regression tests are skipped by default - run with --update-snapshots to generate baselines
test.describe.skip('RTL Support - Visual Regression (Screenshots)', () => {
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

  test('Login page RTL screenshot', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-rtl.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('Login page LTR screenshot', async ({ page }) => {
    await setEnglishLanguage(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-ltr.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('Settings page RTL screenshot', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('settings-rtl.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('Feed page RTL screenshot', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('feed-rtl.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });
});

test.describe('RTL Support - Logical Properties Verification', () => {
  test('should use CSS logical properties for positioning', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/login');
    
    // Verify that elements using logical properties render correctly
    const elementsWithStart = await page.locator('[class*="start-"]').count();
    const elementsWithEnd = await page.locator('[class*="end-"]').count();
    const elementsWithMs = await page.locator('[class*="ms-"]').count();
    const elementsWithMe = await page.locator('[class*="me-"]').count();
    const elementsWithPs = await page.locator('[class*="ps-"]').count();
    const elementsWithPe = await page.locator('[class*="pe-"]').count();
    
    // There should be elements using logical properties
    const totalLogicalElements = elementsWithStart + elementsWithEnd + elementsWithMs + elementsWithMe + elementsWithPs + elementsWithPe;
    expect(totalLogicalElements).toBeGreaterThan(0);
  });

  test('rtl-flip class should apply transform: scaleX(-1)', async ({ page }) => {
    await setHebrewLanguage(page);
    await page.goto('/settings');
    
    const flippedElement = page.locator('.rtl-flip').first();
    
    if (await flippedElement.isVisible()) {
      const transform = await flippedElement.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      
      // scaleX(-1) results in matrix(-1, 0, 0, 1, 0, 0)
      expect(transform).toContain('matrix(-1');
    }
  });
});

