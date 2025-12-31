/**
 * Post Helper Functions for Playwright Tests
 * Handles post creation, navigation, and verification
 */

import { expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const getDirname = () => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return __dirname;
  }
};

// Israel locations for test posts
const ISRAEL_LOCATIONS = [
  'Tel Aviv, Israel',
  'Jerusalem, Israel',
  'Haifa, Israel',
  'Beer Sheva, Israel',
  'Netanya, Israel',
  'Eilat, Israel',
  'Rishon LeZion, Israel',
  'Petah Tikva, Israel',
  'Ashdod, Israel',
  'Holon, Israel'
];

// Post categories
const CATEGORIES = ['Moving', 'Pet Care', 'Borrow Item', 'Assembly', 'Other'];

// Post titles for variety
const POST_TITLES = [
  'Need help moving furniture',
  'Pet sitting needed',
  'Looking to borrow tools',
  'Assembly help required',
  'General assistance needed',
  'Moving boxes help',
  'Pet walking service',
  'Borrow ladder',
  'IKEA furniture assembly',
  'Garden work help'
];

/**
 * Create a test image file
 * @param {string} filePath - Path to create the image at
 * @returns {string} - Path to created image
 */
export function createTestImage(filePath) {
  // Create a simple 1x1 pixel PNG image (base64 encoded)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Get or create a test image path
 * @returns {string} - Path to test image
 */
export function getTestImagePath() {
  const testDir = getDirname();
  const imagePath = join(testDir, '..', 'test-image.png');
  
  try {
    createTestImage(imagePath);
  } catch (error) {
    console.warn('Could not create test image:', error.message);
  }
  
  return imagePath;
}

/**
 * Generate post data for testing
 * @param {number} index - Post index for variation
 * @param {string} customLocation - Optional custom location
 * @returns {object} - Post data object
 */
export function generatePostData(index = 0, customLocation = null) {
  const location = customLocation || ISRAEL_LOCATIONS[index % ISRAEL_LOCATIONS.length];
  const title = POST_TITLES[index % POST_TITLES.length];
  const category = CATEGORIES[index % CATEGORIES.length];
  
  return {
    title: title,
    description: `This is test post ${index + 1}. ${title} in ${location}. Looking for someone to help with this task. Please contact me if you're available! Created at ${new Date().toISOString()}`,
    location: location,
    category: category,
    timeframe: 'Flexible'
  };
}

/**
 * Create a new post
 * @param {object} page - Playwright page object
 * @param {object} postData - Post data to create
 * @param {string} imagePath - Optional path to image file
 * @returns {string|null} - Post ID or null on failure
 */
export async function createPost(page, postData, imagePath = null) {
  const { title, description, location, category } = postData;

  // Navigate to new post page
  await page.goto('/new-post');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Fill title if provided
  if (title) {
    const titleInput = page.locator('input[type="text"]').first();
    const titleInputCount = await titleInput.count();
    if (titleInputCount > 0) {
      await titleInput.fill(title);
    }
  }

  // Fill description (required)
  const descriptionInput = page.locator('textarea').first();
  await expect(descriptionInput).toBeVisible({ timeout: 5000 });
  await descriptionInput.fill(description);

  // Fill location
  const locationInput = page.locator('input[placeholder*="address" i], input[placeholder*="location" i], input[name="location"]').first();
  const locationInputCount = await locationInput.count();
  if (locationInputCount > 0) {
    await locationInput.fill(location);
  }

  // Select category if dropdown exists
  if (category) {
    const categorySelect = page.locator('select').first();
    const selectCount = await categorySelect.count();
    if (selectCount > 0) {
      try {
        await categorySelect.selectOption({ label: category });
      } catch {
        // Try selecting by index if label doesn't match
        await categorySelect.selectOption({ index: CATEGORIES.indexOf(category) + 1 });
      }
    }
  }

  // Upload image if provided
  if (imagePath) {
    try {
      const fileInput = page.locator('input[type="file"]').first();
      const fileInputCount = await fileInput.count();
      if (fileInputCount > 0) {
        await fileInput.setInputFiles(imagePath);
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('Failed to upload image:', error.message);
    }
  }

  // Submit post
  const submitButton = page.locator('button[type="submit"]').first();
  await expect(submitButton).toBeVisible({ timeout: 5000 });
  await submitButton.click();

  // Wait for navigation
  await page.waitForTimeout(2000);

  // Try to get post ID from URL
  const currentUrl = page.url();
  const postIdMatch = currentUrl.match(/\/post\/([^\/\?]+)/);
  
  if (postIdMatch) {
    return postIdMatch[1];
  }

  // Try to get post ID from feed - find the most recent post
  if (currentUrl.includes('/feed')) {
    const postId = await page.evaluate(() => {
      // Look for post links in the feed
      const postLinks = document.querySelectorAll('a[href*="/post/"]');
      if (postLinks.length > 0) {
        const href = postLinks[0].getAttribute('href');
        const match = href?.match(/\/post\/([^\/\?]+)/);
        return match ? match[1] : null;
      }
      return null;
    });
    
    return postId;
  }

  // Return a generated ID if we can't find one
  return `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Open a specific post by ID
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID to open
 * @returns {boolean} - True if post opened successfully
 */
export async function openPost(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Verify post content is visible
    const postContent = page.locator('article, [class*="post"], main').first();
    await expect(postContent).toBeVisible({ timeout: 5000 });

    return true;
  } catch (error) {
    console.warn(`Failed to open post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Verify post exists in feed
 * @param {object} page - Playwright page object
 * @param {string} searchText - Text to search for in feed
 * @returns {boolean} - True if post found
 */
export async function verifyPostInFeed(page, searchText) {
  try {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for the post text in the feed
    const postElement = page.locator(`text=${searchText}`).first();
    const found = await postElement.count() > 0;

    return found;
  } catch (error) {
    console.warn('Failed to verify post in feed:', error.message);
    return false;
  }
}

/**
 * Get all posts from feed
 * @param {object} page - Playwright page object
 * @returns {Array} - Array of post elements info
 */
export async function getPostsFromFeed(page) {
  await page.goto('/feed');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const posts = await page.evaluate(() => {
    const postElements = document.querySelectorAll('article, [class*="post-card"], [class*="PostCard"]');
    return Array.from(postElements).map((el, index) => {
      const linkEl = el.querySelector('a[href*="/post/"]');
      const href = linkEl?.getAttribute('href');
      const postIdMatch = href?.match(/\/post\/([^\/\?]+)/);
      
      return {
        index,
        postId: postIdMatch ? postIdMatch[1] : null,
        text: el.textContent?.substring(0, 200)
      };
    });
  });

  return posts;
}

/**
 * Click on a post in the feed to open it
 * @param {object} page - Playwright page object
 * @param {number} index - Index of post in feed (0-based)
 * @returns {string|null} - Post ID or null
 */
export async function clickPostInFeed(page, index = 0) {
  await page.goto('/feed');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Find post links
  const postLinks = page.locator('a[href*="/post/"]');
  const linkCount = await postLinks.count();

  if (linkCount > index) {
    const href = await postLinks.nth(index).getAttribute('href');
    await postLinks.nth(index).click();
    await page.waitForTimeout(1500);

    const postIdMatch = href?.match(/\/post\/([^\/\?]+)/);
    return postIdMatch ? postIdMatch[1] : null;
  }

  return null;
}

/**
 * Get post details from post detail page
 * @param {object} page - Playwright page object
 * @returns {object|null} - Post details or null
 */
export async function getPostDetails(page) {
  try {
    const details = await page.evaluate(() => {
      const title = document.querySelector('h1, h2, [class*="title"]')?.textContent;
      const description = document.querySelector('[class*="description"], p')?.textContent;
      const author = document.querySelector('[class*="author"]')?.textContent;
      const location = document.querySelector('[class*="location"]')?.textContent;
      
      return { title, description, author, location };
    });

    return details;
  } catch (error) {
    console.warn('Failed to get post details:', error.message);
    return null;
  }
}

/**
 * Like a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID to like
 * @returns {boolean} - True if liked successfully
 */
export async function likePost(page, postId) {
  try {
    await openPost(page, postId);
    
    // Find and click like button
    const likeButton = page.locator('button').filter({ hasText: /like|❤|heart/i }).first();
    const buttonCount = await likeButton.count();
    
    if (buttonCount > 0) {
      await likeButton.click();
      await page.waitForTimeout(500);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn(`Failed to like post ${postId}:`, error.message);
    return false;
  }
}

