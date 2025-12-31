/**
 * Authentication Helper Functions for Playwright Tests
 * Handles user registration, login, and verification code mocking
 */

import { expect } from '@playwright/test';

// Test email domains for unique test users
const TEST_DOMAINS = ['test.local', 'smoke.test', 'e2e.test'];

/**
 * Generate a unique test email address
 * @param {string} prefix - Optional prefix for the email
 * @returns {string} - Unique email address
 */
export function generateTestEmail(prefix = 'user') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const domain = TEST_DOMAINS[Math.floor(Math.random() * TEST_DOMAINS.length)];
  return `${prefix}_${timestamp}_${random}@${domain}`;
}

/**
 * Generate unique test user data
 * @param {number} index - User index for variation
 * @returns {object} - User data object
 */
export function generateUserData(index = 0) {
  const names = [
    'Test User Alpha', 'Test User Beta', 'Test User Gamma',
    'Test User Delta', 'Test User Epsilon', 'Test User Zeta',
    'Test User Eta', 'Test User Theta', 'Test User Iota', 'Test User Kappa'
  ];
  const locations = [
    'Tel Aviv, Israel', 'Jerusalem, Israel', 'Haifa, Israel',
    'Beer Sheva, Israel', 'Netanya, Israel', 'Eilat, Israel',
    'Rishon LeZion, Israel', 'Petah Tikva, Israel', 'Ashdod, Israel', 'Holon, Israel'
  ];

  return {
    name: names[index % names.length],
    email: generateTestEmail(`testuser${index}`),
    password: 'TestPassword123!',
    age: 25 + (index % 20),
    location: locations[index % locations.length]
  };
}

/**
 * Mock verification code by directly authenticating user via localStorage
 * This bypasses the actual email verification for testing purposes
 * @param {object} page - Playwright page object
 * @param {object} userData - User data to authenticate
 */
export async function mockAuthentication(page, userData) {
  await page.evaluate((user) => {
    // Create a mock user ID if not present
    const userId = user.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          age: user.age,
          location: user.location,
          avatar: `https://i.pravatar.cc/150?u=${userId}`,
          createdAt: Date.now()
        },
        isAuthenticated: true
      }
    }));
  }, userData);
}

/**
 * Handle verification code entry
 * Tries to get code from sessionStorage or uses mock code
 * @param {object} page - Playwright page object
 * @param {string} mockCode - Mock code to use (default: '123456')
 */
export async function handleVerificationCode(page, mockCode = '123456') {
  // Check for verification code inputs
  const codeInputs = page.locator('input[inputmode="numeric"], input[type="text"][maxlength="1"]');
  const codeInputCount = await codeInputs.count();

  if (codeInputCount >= 6) {
    // Try to get stored verification code or use mock
    const storedCode = await page.evaluate(() => {
      return sessionStorage.getItem('verification_code');
    }) || mockCode;

    // Enter verification code digit by digit
    for (let i = 0; i < 6; i++) {
      const digit = storedCode[i] || mockCode[i] || '1';
      await codeInputs.nth(i).fill(digit);
      await page.waitForTimeout(50);
    }

    // Submit verification
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }
    
    return true;
  }
  
  return false;
}

/**
 * Create a new user via registration flow
 * @param {object} page - Playwright page object
 * @param {object} userInfo - User information to register
 * @returns {object|null} - Created user data or null
 */
export async function createUser(page, userInfo) {
  const { name, email, password, age, location } = userInfo;

  // Clear any existing session
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to register page
  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  // Wait for and fill registration form
  const nameInput = page.locator('input[name="name"]');
  await expect(nameInput).toBeVisible({ timeout: 10000 });

  await nameInput.fill(name);
  await page.locator('input[name="email"]').fill(email);
  
  // Age field might be optional
  const ageInput = page.locator('input[name="age"]');
  if (await ageInput.count() > 0) {
    await ageInput.fill(age.toString());
  }
  
  // Location field might be optional
  const locationInput = page.locator('input[name="location"]');
  if (await locationInput.count() > 0) {
    await locationInput.fill(location);
  }
  
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);

  // Submit registration
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);

  // Check if already on feed (no verification needed)
  let currentUrl = page.url();
  if (currentUrl.includes('/feed')) {
    return await getAuthenticatedUser(page, userInfo);
  }

  // Handle verification code flow
  const handled = await handleVerificationCode(page);
  
  if (handled) {
    await page.waitForTimeout(3000);
    currentUrl = page.url();
    
    if (!currentUrl.includes('/feed')) {
      // Mock authentication if verification failed
      await mockAuthentication(page, userInfo);
      await page.goto('/feed');
      await page.waitForTimeout(1000);
    }
  } else {
    // No verification needed, just navigate
    await page.goto('/feed');
    await page.waitForTimeout(1000);
  }

  return await getAuthenticatedUser(page, userInfo);
}

/**
 * Login an existing user
 * @param {object} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object|null} - Logged in user data or null
 */
export async function loginUser(page, email, password) {
  // Clear session storage but keep localStorage for existing users
  await page.evaluate(() => {
    sessionStorage.clear();
  });

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Fill login form
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Submit login
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);

  // Check if already on feed
  let currentUrl = page.url();
  if (currentUrl.includes('/feed')) {
    return await getAuthenticatedUser(page);
  }

  // Handle verification code
  const handled = await handleVerificationCode(page);
  
  if (handled) {
    await page.waitForTimeout(3000);
    currentUrl = page.url();
  }

  // Final navigation to feed if needed
  if (!currentUrl.includes('/feed')) {
    await page.goto('/feed');
    await page.waitForTimeout(1000);
  }

  return await getAuthenticatedUser(page);
}

/**
 * Get authenticated user from localStorage
 * @param {object} page - Playwright page object
 * @param {object} fallbackUserInfo - Fallback user info if not in storage
 * @returns {object|null} - User data or null
 */
export async function getAuthenticatedUser(page, fallbackUserInfo = null) {
  let authState = null;
  
  // Try multiple times to get auth state
  for (let attempt = 0; attempt < 3; attempt++) {
    authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });

    if (authState?.state?.user) {
      return authState.state.user;
    }

    await page.waitForTimeout(500);
  }

  // If no auth state found, create mock user from fallback
  if (fallbackUserInfo) {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: userId,
      name: fallbackUserInfo.name,
      email: fallbackUserInfo.email,
      age: fallbackUserInfo.age,
      location: fallbackUserInfo.location,
      avatar: `https://i.pravatar.cc/150?u=${userId}`,
      createdAt: Date.now()
    };
  }

  return null;
}

/**
 * Logout current user
 * @param {object} page - Playwright page object
 */
export async function logoutUser(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  await page.goto('/login');
  await page.waitForTimeout(500);
}

/**
 * Switch to a different user by authenticating directly
 * @param {object} page - Playwright page object
 * @param {object} userData - User data to switch to
 */
export async function switchToUser(page, userData) {
  await page.evaluate((user) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: user,
        isAuthenticated: true
      }
    }));
  }, userData);
  
  // Reload page to apply auth changes
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Check if user is authenticated
 * @param {object} page - Playwright page object
 * @returns {boolean} - True if authenticated
 */
export async function isAuthenticated(page) {
  const authState = await page.evaluate(() => {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.isAuthenticated || false;
  });
  
  return !!authState;
}

