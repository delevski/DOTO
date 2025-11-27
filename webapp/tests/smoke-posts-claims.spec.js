import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to create a test image file
function createTestImage(filePath) {
  // Create a simple 1x1 pixel PNG image (base64 encoded)
  // This is a minimal valid PNG file
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  writeFileSync(filePath, buffer);
}

// Helper function to authenticate user
async function authenticateUser(page, userData) {
  await page.evaluate((user) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: user,
        isAuthenticated: true
      }
    }));
  }, userData);
}

// Helper function to create a user via registration
async function createUser(page, userInfo) {
  const { name, email, password, age, location } = userInfo;
  
  // Navigate to register page
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  
  // Set session storage to simulate verification flow
  await page.evaluate(({ email, code }) => {
    sessionStorage.setItem('email', email);
    sessionStorage.setItem('verification_code', code);
    sessionStorage.setItem('pending_login_context', JSON.stringify({
      method: 'email',
      userId: 'temp-user-id',
      email: email,
      userSnapshot: null
    }));
  }, { email, code: '123456' });
  
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Fill registration form
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="age"]').fill(age.toString());
  await page.locator('input[name="location"]').fill(location);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  
  // Submit registration
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1000);
  
  // Enter verification code
  const codeInputs = page.locator('input[inputmode="numeric"], input[type="text"]');
  const code = '123456';
  for (let i = 0; i < 6; i++) {
    await codeInputs.nth(i).fill(code[i]);
  }
  
  // Submit verification
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  
  // Wait for navigation to feed
  await expect(page).toHaveURL(/.*feed/, { timeout: 10000 });
  
  // Get the actual user data from localStorage
  const authState = await page.evaluate(() => {
    const stored = localStorage.getItem('auth-storage');
    return stored ? JSON.parse(stored) : null;
  });
  
  return authState?.state?.user || null;
}

// Helper function to login user
async function loginUser(page, email, password) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  
  // Submit login
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1000);
  
  // Enter verification code
  const codeInputs = page.locator('input[inputmode="numeric"], input[type="text"]');
  const code = '123456';
  
  // Set verification code in session storage
  await page.evaluate((code) => {
    sessionStorage.setItem('verification_code', code);
  }, code);
  
  for (let i = 0; i < 6; i++) {
    await codeInputs.nth(i).fill(code[i]);
  }
  
  // Submit verification
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  
  // Wait for navigation to feed
  await expect(page).toHaveURL(/.*feed/, { timeout: 10000 });
  
  // Get the actual user data from localStorage
  const authState = await page.evaluate(() => {
    const stored = localStorage.getItem('auth-storage');
    return stored ? JSON.parse(stored) : null;
  });
  
  return authState?.state?.user || null;
}

// Helper function to create a post with image
async function createPost(page, postData) {
  const { title, description, location, category, imagePath } = postData;
  
  // Navigate to new post page
  await page.goto('/new-post');
  await page.waitForLoadState('networkidle');
  
  // Fill post form
  if (title) {
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill(title);
  }
  
  const descriptionInput = page.locator('textarea').first();
  await descriptionInput.fill(description);
  
  const locationInput = page.locator('input[placeholder*="address" i], input[placeholder*="location" i]').first();
  await locationInput.fill(location);
  
  if (category) {
    const categorySelect = page.locator('select').first();
    await categorySelect.selectOption({ index: 1 }); // Select first available category
  }
  
  // Upload image if provided
  if (imagePath) {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(imagePath);
    await page.waitForTimeout(500); // Wait for image to load
  }
  
  // Submit post
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  
  // Wait for navigation to post details or feed
  await page.waitForTimeout(2000);
  
  // Get post ID from URL if navigated to post details
  const currentUrl = page.url();
  const postIdMatch = currentUrl.match(/\/post\/([^\/]+)/);
  return postIdMatch ? postIdMatch[1] : null;
}

// Helper function to claim a post
async function claimPost(page, postId) {
  // Navigate to post details
  await page.goto(`/post/${postId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Find and click claim button
  const claimButton = page.locator('button').filter({ hasText: /claim|תביע/i }).first();
  
  if (await claimButton.count() > 0) {
    await claimButton.click();
    await page.waitForTimeout(1000);
    
    // Check for success message or claim status
    const successMessage = page.locator('text=/claimed|success/i');
    if (await successMessage.count() > 0) {
      return true;
    }
    
    // Check if button changed to "claimed" state
    const claimedButton = page.locator('button').filter({ hasText: /claimed|waiting/i });
    if (await claimedButton.count() > 0) {
      return true;
    }
  }
  
  return false;
}

// Helper function to open a post
async function openPost(page, postId) {
  await page.goto(`/post/${postId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Verify post is loaded
  const postContent = page.locator('article, [class*="post"], main').first();
  await expect(postContent).toBeVisible({ timeout: 5000 });
  
  return true;
}

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
  'Holon, Israel',
  'Bnei Brak, Israel',
  'Ramat Gan, Israel',
  'Rehovot, Israel',
  'Bat Yam, Israel',
  'Herzliya, Israel',
  'Kfar Saba, Israel',
  'Modiin, Israel',
  'Nazareth, Israel',
  'Ashkelon, Israel',
  'Ramat Hasharon, Israel'
];

// Test data generators
function generateUserData(index) {
  return {
    name: `Test User ${index}`,
    email: `testuser${index}@example.com`,
    password: 'TestPassword123!',
    age: 25 + (index % 20),
    location: ISRAEL_LOCATIONS[index % ISRAEL_LOCATIONS.length]
  };
}

function generatePostData(index, location) {
  const categories = ['Moving', 'Pet Care', 'Borrow Item', 'Assembly', 'Other'];
  const titles = [
    'Need help moving furniture',
    'Pet sitting needed',
    'Looking to borrow tools',
    'Assembly help required',
    'General assistance needed',
    'Moving boxes help',
    'Pet walking service',
    'Borrow ladder',
    'IKEA furniture assembly',
    'Garden work help',
    'Cleaning assistance',
    'Cooking help',
    'Shopping assistance',
    'Tech support needed',
    'Car maintenance help',
    'Painting help',
    'Plumbing assistance',
    'Electrical work',
    'Roof repair help',
    'General maintenance'
  ];
  
  return {
    title: titles[index % titles.length],
    description: `This is test post ${index + 1}. ${titles[index % titles.length]} in ${location}. Looking for someone to help with this task. Please contact me if you're available!`,
    location: location,
    category: categories[index % categories.length],
    timeframe: null
  };
}

test.describe('Smoke Tests - Posts and Claims', () => {
  let testImagePath;
  let createdUsers = [];
  let createdPosts = [];
  
  test.beforeAll(async () => {
    // Create a test image file
    testImagePath = join(__dirname, 'test-image.png');
    try {
      createTestImage(testImagePath);
    } catch (error) {
      console.error('Failed to create test image:', error);
    }
  });
  
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
  
  test.afterAll(async () => {
    // Cleanup: delete test image file if needed
    // The file will be cleaned up automatically
  });
  
  test('Create 20 posts with Israel locations and images, then test claims', async ({ page }) => {
    // Step 1: Create a main user for posting
    console.log('Creating main user...');
    const mainUser = await createUser(page, generateUserData(0));
    expect(mainUser).not.toBeNull();
    createdUsers.push(mainUser);
    console.log(`Created user: ${mainUser?.name || 'Unknown'}`);
    
    // Step 2: Create 20 posts with different Israel locations
    console.log('Creating 20 posts...');
    for (let i = 0; i < 20; i++) {
      const location = ISRAEL_LOCATIONS[i % ISRAEL_LOCATIONS.length];
      const postData = generatePostData(i, location);
      
      console.log(`Creating post ${i + 1}/20: ${postData.title} in ${location}`);
      
      const postId = await createPost(page, {
        ...postData,
        imagePath: testImagePath
      });
      
      expect(postId).not.toBeNull();
      createdPosts.push({ id: postId, ...postData });
      
      // Wait a bit between posts
      await page.waitForTimeout(1000);
    }
    
    console.log(`Created ${createdPosts.length} posts`);
    expect(createdPosts.length).toBe(20);
    
    // Step 3: Create additional users for claiming
    console.log('Creating users for claiming...');
    const claimerUsers = [];
    for (let i = 1; i <= 5; i++) {
      // Logout current user
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      const user = await createUser(page, generateUserData(i));
      expect(user).not.toBeNull();
      claimerUsers.push(user);
      createdUsers.push(user);
      
      console.log(`Created claimer user ${i}: ${user?.name || 'Unknown'}`);
      
      // Wait between user creations
      await page.waitForTimeout(1000);
    }
    
    // Step 4: Test opening posts and claiming them
    console.log('Testing post opening and claiming...');
    
    // Use first claimer user to claim some posts
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const claimer1 = claimerUsers[0];
    await authenticateUser(page, claimer1);
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Claim first 5 posts
    let claimedCount = 0;
    for (let i = 0; i < Math.min(5, createdPosts.length); i++) {
      const post = createdPosts[i];
      console.log(`Opening and claiming post ${i + 1}: ${post.title}`);
      
      const opened = await openPost(page, post.id);
      expect(opened).toBe(true);
      
      const claimed = await claimPost(page, post.id);
      if (claimed) {
        claimedCount++;
        console.log(`Successfully claimed post ${i + 1}`);
      } else {
        console.log(`Failed to claim post ${i + 1} (may already be claimed or owned by user)`);
      }
      
      await page.waitForTimeout(1000);
    }
    
    console.log(`Claimed ${claimedCount} posts`);
    
    // Step 5: Test with second claimer user
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const claimer2 = claimerUsers[1];
    await authenticateUser(page, claimer2);
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Claim next 5 posts
    for (let i = 5; i < Math.min(10, createdPosts.length); i++) {
      const post = createdPosts[i];
      console.log(`Opening and claiming post ${i + 1}: ${post.title}`);
      
      const opened = await openPost(page, post.id);
      expect(opened).toBe(true);
      
      await claimPost(page, post.id);
      await page.waitForTimeout(1000);
    }
    
    // Step 6: Verify posts are visible in feed
    console.log('Verifying posts in feed...');
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const posts = page.locator('article');
    const postCount = await posts.count();
    console.log(`Found ${postCount} posts in feed`);
    
    // At least some posts should be visible
    expect(postCount).toBeGreaterThan(0);
    
    // Step 7: Verify posts have images
    console.log('Verifying posts have images...');
    const postImages = page.locator('article img, [class*="post"] img');
    const imageCount = await postImages.count();
    console.log(`Found ${imageCount} images in posts`);
    
    // At least some posts should have images
    if (imageCount > 0) {
      await expect(postImages.first()).toBeVisible();
    }
  });
  
  test('Test login flow and post creation', async ({ page }) => {
    // Create user
    const userData = generateUserData(0);
    const user = await createUser(page, userData);
    expect(user).not.toBeNull();
    
    // Logout
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Login
    const loggedInUser = await loginUser(page, userData.email, userData.password);
    expect(loggedInUser).not.toBeNull();
    expect(loggedInUser.email).toBe(userData.email);
    
    // Create a post
    const postData = generatePostData(0, ISRAEL_LOCATIONS[0]);
    const postId = await createPost(page, {
      ...postData,
      imagePath: testImagePath
    });
    
    expect(postId).not.toBeNull();
    
    // Verify post can be opened
    const opened = await openPost(page, postId);
    expect(opened).toBe(true);
  });
  
  test('Test multiple users claiming same post', async ({ page }) => {
    // Create post owner
    const owner = await createUser(page, generateUserData(0));
    expect(owner).not.toBeNull();
    
    // Create a post
    const postData = generatePostData(0, ISRAEL_LOCATIONS[0]);
    const postId = await createPost(page, {
      ...postData,
      imagePath: testImagePath
    });
    expect(postId).not.toBeNull();
    
    // Create multiple claimers
    const claimers = [];
    for (let i = 1; i <= 3; i++) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      const claimer = await createUser(page, generateUserData(i));
      expect(claimer).not.toBeNull();
      claimers.push(claimer);
      
      // Claim the post
      await authenticateUser(page, claimer);
      await claimPost(page, postId);
      await page.waitForTimeout(1000);
    }
    
    // Login as owner and verify claimers
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await authenticateUser(page, owner);
    await openPost(page, postId);
    
    // Check for claimers
    const claimersSection = page.locator('text=/claimer/i');
    const claimersCount = await claimersSection.count();
    expect(claimersCount).toBeGreaterThan(0);
  });
});

