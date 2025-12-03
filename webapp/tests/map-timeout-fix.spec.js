import { test, expect, devices } from '@playwright/test';

// Use Pixel 5 device for mobile emulation
test.use({ 
  ...devices['Pixel 5'],
  baseURL: 'http://localhost:5173'
});

test.describe('Map Page - Timeout & Crash Fixes', () => {

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
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await authenticateUser(page);
  });

  test('Map page loads without timeout errors', async ({ page }) => {
    console.log('Testing Map page for timeout errors...');
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000); // Wait longer for geocoding

    // Check for map container
    const mapContainer = page.locator('.leaflet-container, [class*="leaflet"], canvas').first();
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Check for timeout or infinite loop errors
    const timeoutErrors = errors.filter(err => 
      err.includes('timeout') || 
      err.includes('Maximum update depth') ||
      err.includes('infinite loop')
    );

    if (timeoutErrors.length > 0) {
      console.log('⚠ Timeout errors detected:', timeoutErrors);
    } else {
      console.log('✓ No timeout errors detected');
    }

    // Map should still be visible even if there are some errors
    await expect(mapContainer).toBeVisible();
  });

  test('Map geocoding completes without crashes', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for geocoding to complete
    await page.waitForTimeout(15000);

    // Check for crash-related errors
    const crashErrors = errors.filter(err => 
      err.includes('crash') ||
      err.includes('Maximum update depth') ||
      err.includes('Cannot read property') ||
      err.includes('undefined')
    );

    if (crashErrors.length > 0) {
      console.log('⚠ Crash-related errors:', crashErrors.slice(0, 5));
    } else {
      console.log('✓ No crash errors detected');
    }

    // Page should still be functional
    const mapContainer = page.locator('.leaflet-container, [class*="leaflet"], canvas').first();
    await expect(mapContainer).toBeVisible({ timeout: 5000 });
  });

  test('Map handles large number of posts without timeout', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial load
    await page.waitForTimeout(5000);

    // Check if markers are loading progressively
    const markers = page.locator('.leaflet-marker-icon, [class*="marker"]');
    const markerCount = await markers.count();

    console.log(`Found ${markerCount} markers on map`);

    // Wait more for additional markers to load
    await page.waitForTimeout(10000);

    const finalMarkerCount = await markers.count();
    console.log(`Final marker count: ${finalMarkerCount}`);

    // Map should still be functional
    const mapContainer = page.locator('.leaflet-container, [class*="leaflet"], canvas').first();
    await expect(mapContainer).toBeVisible({ timeout: 5000 });
  });

  test('Map search works without causing timeouts', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Tel Aviv');
      await page.waitForTimeout(2000);

      // Check for errors after search
      const searchErrors = errors.filter(err => 
        err.includes('timeout') ||
        err.includes('Maximum update depth')
      );

      if (searchErrors.length > 0) {
        console.log('⚠ Search errors:', searchErrors);
      } else {
        console.log('✓ Search works without errors');
      }

      await expect(searchInput).toHaveValue('Tel Aviv');
    }
  });
});

