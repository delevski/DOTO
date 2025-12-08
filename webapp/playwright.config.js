import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for DOTO Mobile App Tests
 * 
 * Includes:
 * - Desktop browsers (Chrome, Firefox, Safari)
 * - Mobile viewports (iPhone 12, Pixel 5, Galaxy S24)
 * - Comprehensive smoke test configuration
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* Maximum time one test can run for */
  timeout: 60 * 1000,
  
  /* Maximum time expect() should wait for condition to be met */
  expect: {
    timeout: 10000
  },
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only - retry failed tests twice */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'on-first-retry',
    
    /* Default navigation timeout */
    navigationTimeout: 30000,
    
    /* Default action timeout */
    actionTimeout: 15000,
  },

  /* Configure projects for different browsers and devices */
  projects: [
    // Desktop Browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },

    // Mobile Devices - Primary
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
        hasTouch: true
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true
      },
    },

    // Additional Mobile Devices for Comprehensive Testing
    {
      name: 'iPhone 14 Pro Max',
      use: {
        ...devices['iPhone 14 Pro Max'],
        isMobile: true,
        hasTouch: true
      },
    },
    {
      name: 'Galaxy S24',
      use: {
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      },
    },

    // Tablet Devices
    {
      name: 'iPad Pro',
      use: {
        ...devices['iPad Pro 11'],
        isMobile: true,
        hasTouch: true
      },
    },

    // Smoke Tests - Mobile Only (for comprehensive-mobile-smoke.spec.js)
    {
      name: 'smoke-mobile-iphone',
      testMatch: '**/comprehensive-mobile-smoke.spec.js',
      use: {
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true,
        /* Extended timeouts for smoke tests */
        navigationTimeout: 45000,
        actionTimeout: 20000
      },
    },
    {
      name: 'smoke-mobile-android',
      testMatch: '**/comprehensive-mobile-smoke.spec.js',
      use: {
        ...devices['Pixel 5'],
        isMobile: true,
        hasTouch: true,
        navigationTimeout: 45000,
        actionTimeout: 20000
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results/',

  /* Folder for test artifacts such as screenshots, videos, traces */
  snapshotDir: 'tests/screenshots/',
});
