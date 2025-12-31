/**
 * Profile Helper Functions for Playwright Tests
 * Handles editing profile, saving changes, and verification
 */

import { expect } from '@playwright/test';

/**
 * Navigate to profile page
 * @param {object} page - Playwright page object
 */
export async function goToProfile(page) {
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Navigate to edit profile page
 * @param {object} page - Playwright page object
 */
export async function goToEditProfile(page) {
  await page.goto('/edit-profile');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Get current profile data
 * @param {object} page - Playwright page object
 * @returns {object} - Profile data
 */
export async function getProfileData(page) {
  try {
    await goToProfile(page);

    const profile = await page.evaluate(() => {
      const nameEl = document.querySelector('[class*="name"], h1, h2');
      const bioEl = document.querySelector('[class*="bio"], [class*="description"]');
      const emailEl = document.querySelector('[class*="email"]');
      const avatarEl = document.querySelector('[class*="avatar"] img, [class*="profile"] img');
      const locationEl = document.querySelector('[class*="location"]');

      return {
        name: nameEl?.textContent?.trim(),
        bio: bioEl?.textContent?.trim(),
        email: emailEl?.textContent?.trim(),
        avatar: avatarEl?.src,
        location: locationEl?.textContent?.trim()
      };
    });

    return profile;
  } catch (error) {
    console.warn('Failed to get profile data:', error.message);
    return {};
  }
}

/**
 * Edit profile with new data
 * @param {object} page - Playwright page object
 * @param {object} updates - Profile updates { name, bio, location }
 * @returns {boolean} - True if updated successfully
 */
export async function editProfile(page, updates) {
  try {
    await goToEditProfile(page);

    const { name, bio, location } = updates;

    // Update name
    if (name) {
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input:near(:text("name"))').first();
      if (await nameInput.count() > 0) {
        await nameInput.clear();
        await nameInput.fill(name);
      }
    }

    // Update bio
    if (bio !== undefined) {
      const bioInput = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i], textarea, input[name="bio"]').first();
      if (await bioInput.count() > 0) {
        await bioInput.clear();
        await bioInput.fill(bio);
      }
    }

    // Update location
    if (location) {
      const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
      if (await locationInput.count() > 0) {
        await locationInput.clear();
        await locationInput.fill(location);
      }
    }

    return true;
  } catch (error) {
    console.warn('Failed to edit profile:', error.message);
    return false;
  }
}

/**
 * Save profile changes
 * @param {object} page - Playwright page object
 * @returns {boolean} - True if saved successfully
 */
export async function saveProfile(page) {
  try {
    // Find and click save button
    const saveButton = page.locator([
      'button:has-text("save")',
      'button:has-text("שמור")',
      'button[type="submit"]',
      '[class*="save"] button'
    ].join(', ')).first();

    if (await saveButton.count() === 0) {
      console.log('No save button found');
      return false;
    }

    await saveButton.click();
    await page.waitForTimeout(2000);

    // Check for success indicators
    const successIndicators = [
      page.locator('text=/saved|success|updated/i'),
      page.locator('[class*="success"]'),
      page.locator('text=/profile.*updated/i')
    ];

    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        return true;
      }
    }

    // Check if navigated away from edit page (implies success)
    const currentUrl = page.url();
    if (!currentUrl.includes('/edit')) {
      return true;
    }

    // Default to true if no errors visible
    const errorIndicator = page.locator('[class*="error"], text=/error|failed/i');
    return await errorIndicator.count() === 0;
  } catch (error) {
    console.warn('Failed to save profile:', error.message);
    return false;
  }
}

/**
 * Edit and save profile in one operation
 * @param {object} page - Playwright page object
 * @param {object} updates - Profile updates { name, bio, location }
 * @returns {boolean} - True if updated and saved successfully
 */
export async function updateProfile(page, updates) {
  const edited = await editProfile(page, updates);
  if (!edited) return false;
  
  return await saveProfile(page);
}

/**
 * Verify profile changes persisted
 * @param {object} page - Playwright page object
 * @param {object} expectedData - Expected profile data
 * @returns {boolean} - True if all expected data matches
 */
export async function verifyProfileChanges(page, expectedData) {
  try {
    // Reload page to ensure we're seeing fresh data
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const currentProfile = await getProfileData(page);

    let allMatch = true;

    if (expectedData.name && currentProfile.name !== expectedData.name) {
      console.log(`Name mismatch: expected "${expectedData.name}", got "${currentProfile.name}"`);
      allMatch = false;
    }

    if (expectedData.bio !== undefined && currentProfile.bio !== expectedData.bio) {
      console.log(`Bio mismatch: expected "${expectedData.bio}", got "${currentProfile.bio}"`);
      allMatch = false;
    }

    if (expectedData.location && currentProfile.location !== expectedData.location) {
      console.log(`Location mismatch: expected "${expectedData.location}", got "${currentProfile.location}"`);
      allMatch = false;
    }

    return allMatch;
  } catch (error) {
    console.warn('Failed to verify profile changes:', error.message);
    return false;
  }
}

/**
 * Change profile avatar
 * @param {object} page - Playwright page object
 * @param {string} imagePath - Path to image file
 * @returns {boolean} - True if avatar changed successfully
 */
export async function changeAvatar(page, imagePath) {
  try {
    await goToEditProfile(page);

    // Find avatar upload input
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() === 0) {
      // Try clicking on avatar to trigger file input
      const avatarButton = page.locator('[class*="avatar"] button, button:has([class*="avatar"])').first();
      if (await avatarButton.count() > 0) {
        await avatarButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Try file input again
    const fileInputAgain = page.locator('input[type="file"]').first();
    if (await fileInputAgain.count() > 0) {
      await fileInputAgain.setInputFiles(imagePath);
      await page.waitForTimeout(1000);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Failed to change avatar:', error.message);
    return false;
  }
}

/**
 * Go to settings page
 * @param {object} page - Playwright page object
 */
export async function goToSettings(page) {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Toggle dark mode setting
 * @param {object} page - Playwright page object
 * @returns {boolean} - True if toggled successfully
 */
export async function toggleDarkMode(page) {
  try {
    await goToSettings(page);

    const darkModeToggle = page.locator([
      'input[name*="dark" i]',
      'button:has-text("dark")',
      '[class*="dark-mode"] input',
      '[class*="theme"] input'
    ].join(', ')).first();

    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Failed to toggle dark mode:', error.message);
    return false;
  }
}

/**
 * Change language setting
 * @param {object} page - Playwright page object
 * @param {string} language - Language code (e.g., 'en', 'he')
 * @returns {boolean} - True if changed successfully
 */
export async function changeLanguage(page, language) {
  try {
    await goToSettings(page);

    // Find language selector
    const languageSelect = page.locator('select[name*="language" i], [class*="language"] select').first();
    
    if (await languageSelect.count() > 0) {
      await languageSelect.selectOption(language);
      await page.waitForTimeout(500);
      return true;
    }

    // Try buttons for language selection
    const languageButton = page.locator(`button:has-text("${language}"), [class*="language"] button`).first();
    if (await languageButton.count() > 0) {
      await languageButton.click();
      await page.waitForTimeout(500);
      return true;
    }

    return false;
  } catch (error) {
    console.warn(`Failed to change language to ${language}:`, error.message);
    return false;
  }
}

/**
 * Get user stats from profile
 * @param {object} page - Playwright page object
 * @returns {object} - User stats
 */
export async function getUserStats(page) {
  try {
    await goToProfile(page);

    const stats = await page.evaluate(() => {
      const postCountEl = document.querySelector('[class*="posts"] [class*="count"], [class*="post-count"]');
      const helpedCountEl = document.querySelector('[class*="helped"] [class*="count"], [class*="helped-count"]');
      const ratingEl = document.querySelector('[class*="rating"]');
      const streakEl = document.querySelector('[class*="streak"]');

      return {
        postsCount: parseInt(postCountEl?.textContent?.trim(), 10) || 0,
        helpedCount: parseInt(helpedCountEl?.textContent?.trim(), 10) || 0,
        rating: parseFloat(ratingEl?.textContent?.trim()) || 0,
        streak: parseInt(streakEl?.textContent?.trim(), 10) || 0
      };
    });

    return stats;
  } catch (error) {
    console.warn('Failed to get user stats:', error.message);
    return { postsCount: 0, helpedCount: 0, rating: 0, streak: 0 };
  }
}

/**
 * Logout from profile/settings
 * @param {object} page - Playwright page object
 * @returns {boolean} - True if logged out successfully
 */
export async function logout(page) {
  try {
    // Try profile page logout
    await goToProfile(page);
    
    let logoutButton = page.locator([
      'button:has-text("logout")',
      'button:has-text("sign out")',
      'button:has-text("התנתק")',
      '[class*="logout"]'
    ].join(', ')).first();

    if (await logoutButton.count() === 0) {
      // Try settings page
      await goToSettings(page);
      logoutButton = page.locator([
        'button:has-text("logout")',
        'button:has-text("sign out")',
        'button:has-text("התנתק")',
        '[class*="logout"]'
      ].join(', ')).first();
    }

    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      await page.waitForTimeout(1500);
      
      // Verify logged out
      const currentUrl = page.url();
      return currentUrl.includes('/login') || currentUrl.includes('/register') || currentUrl === '/';
    }

    return false;
  } catch (error) {
    console.warn('Failed to logout:', error.message);
    return false;
  }
}

/**
 * Generate random profile updates for testing
 * @param {number} index - Index for variation
 * @returns {object} - Profile update data
 */
export function generateProfileUpdate(index = 0) {
  const names = [
    'Updated User Alpha', 'Updated User Beta', 'Updated User Gamma',
    'Updated User Delta', 'Updated User Epsilon'
  ];
  
  const bios = [
    'Updated bio - I love helping people in my community!',
    'Updated bio - Always ready to lend a hand.',
    'Updated bio - Community helper and neighbor.',
    'Updated bio - Making the world better, one task at a time.',
    'Updated bio - Here to help!'
  ];

  const locations = [
    'Updated Location - Tel Aviv',
    'Updated Location - Jerusalem',
    'Updated Location - Haifa',
    'Updated Location - Netanya',
    'Updated Location - Eilat'
  ];

  return {
    name: names[index % names.length],
    bio: bios[index % bios.length],
    location: locations[index % locations.length]
  };
}

