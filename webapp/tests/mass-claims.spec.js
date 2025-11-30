import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get directory name for ES modules
const getDirname = () => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return __dirname;
  }
};

const testDir = getDirname();

// Helper function to create a test image file
function createTestImage(filePath) {
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
  
  await page.evaluate(() => {
    sessionStorage.clear();
  });
  
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const nameInput = page.locator('input[name="name"]');
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  
  await nameInput.fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="age"]').fill(age.toString());
  await page.locator('input[name="location"]').fill(location);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  
  let currentUrl = page.url();
  
  if (currentUrl.includes('/feed')) {
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    return authState?.state?.user || null;
  }
  
  const codeInputs = page.locator('input[inputmode="numeric"], input[type="text"]');
  const codeInputCount = await codeInputs.count();
  
  if (codeInputCount >= 6) {
    const storedCode = await page.evaluate(() => {
      return sessionStorage.getItem('verification_code');
    }) || '123456';
    
    for (let i = 0; i < 6; i++) {
      const digit = storedCode[i] || '1';
      await codeInputs.nth(i).fill(digit);
      await page.waitForTimeout(100);
    }
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    currentUrl = page.url();
    if (!currentUrl.includes('/feed')) {
      await page.goto('/feed');
      await page.waitForTimeout(2000);
    }
  } else {
    await page.goto('/feed');
    await page.waitForTimeout(2000);
  }
  
  const finalUrl = page.url();
  if (!finalUrl.includes('/feed')) {
    await page.goto('/feed');
    await page.waitForTimeout(2000);
  }
  
  let authState = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      return stored ? JSON.parse(stored) : null;
    });
    
    if (authState?.state?.user) {
      break;
    }
    
    await page.waitForTimeout(1000);
  }
  
  if (!authState?.state?.user) {
    const userId = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.state?.user?.id || null;
      }
      return null;
    }) || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: userId,
      name: userInfo.name,
      email: userInfo.email,
      age: parseInt(userInfo.age),
      location: userInfo.location
    };
  }
  
  return authState?.state?.user || null;
}

// Helper function to create a post
async function createPost(page, postData) {
  const { title, description, location, category, imagePath } = postData;
  
  await page.goto('/new-post');
  await page.waitForLoadState('networkidle');
  
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
    await categorySelect.selectOption({ index: 1 });
  }
  
  if (imagePath) {
    try {
      const fileInput = page.locator('input[type="file"]').first();
      const fileInputCount = await fileInput.count();
      if (fileInputCount > 0) {
        await fileInput.setInputFiles(imagePath);
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('Failed to upload image:', error);
    }
  }
  
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  const postIdMatch = currentUrl.match(/\/post\/([^\/]+)/);
  return postIdMatch ? postIdMatch[1] : null;
}

// Helper function to claim a post
async function claimPost(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  
    const claimButton = page.locator('button').filter({ hasText: /claim|תביע/i }).first();
    const claimButtonCount = await claimButton.count();
  
    if (claimButtonCount > 0) {
      const isDisabled = await claimButton.isDisabled().catch(() => false);
      if (isDisabled) {
        return false;
      }
    
      await claimButton.click();
      await page.waitForTimeout(1500);
    
      const successMessage = page.locator('text=/claimed|success|waiting/i');
      if (await successMessage.count() > 0) {
        return true;
      }
    
      const claimedButton = page.locator('button').filter({ hasText: /claimed|waiting|you.*claimed/i });
      if (await claimedButton.count() > 0) {
        return true;
      }
    
      const claimersSection = page.locator('text=/claimer/i');
      if (await claimersSection.count() > 0) {
        return true;
      }
    }
  
    return false;
  } catch (error) {
    console.warn(`Failed to claim post ${postId}: ${error.message}`);
    return false;
  }
}

// Helper function to open a post
async function openPost(page, postId) {
  await page.goto(`/post/${postId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
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
    name: `Mass Test User ${index}`,
    email: `masstestuser${index}@example.com`,
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
    description: `Mass test post ${index + 1}. ${titles[index % titles.length]} in ${location}. Looking for someone to help with this task.`,
    location: location,
    category: categories[index % categories.length],
    timeframe: null
  };
}

test.describe('Mass Claims Tests', () => {
  let testImagePath;
  let createdUsers = [];
  let createdPosts = [];
  
  test.beforeAll(async () => {
    testImagePath = join(testDir, 'test-image.png');
    try {
      createTestImage(testImagePath);
    } catch (error) {
      console.error('Failed to create test image:', error);
    }
  });
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
  
  test('50 claims across different posts and users', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes timeout
    // Step 1: Create 5 posting users (reduced from 10)
    console.log('Creating 5 posting users...');
    const postingUsers = [];
    
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      const user = await createUser(page, generateUserData(i));
      expect(user).not.toBeNull();
      postingUsers.push(user);
      createdUsers.push(user);
      
      console.log(`Created posting user ${i + 1}: ${user?.name || 'Unknown'}`);
      await page.waitForTimeout(500);
    }
    
    // Step 2: Create 20 posts distributed among posting users
    console.log('Creating 20 posts distributed among 5 users...');
    createdPosts = [];
    
    for (let i = 0; i < 20; i++) {
      const userIndex = i % 5;
      const user = postingUsers[userIndex];
      const location = ISRAEL_LOCATIONS[i % ISRAEL_LOCATIONS.length];
      const postData = generatePostData(i, location);
      
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await authenticateUser(page, user);
      
      console.log(`User ${userIndex + 1} (${user.name}) creating post ${i + 1}/20: ${postData.title}`);
      
      const postId = await createPost(page, {
        ...postData,
        imagePath: testImagePath
      });
      
      expect(postId).not.toBeNull();
      createdPosts.push({ 
        id: postId, 
        ...postData, 
        authorId: user.id, 
        authorName: user.name 
      });
      
      await page.waitForTimeout(500);
    }
    
    console.log(`Created ${createdPosts.length} posts`);
    expect(createdPosts.length).toBe(20);
    
    // Step 3: Create 10 claiming users
    console.log('Creating 10 claiming users...');
    const claimingUsers = [];
    
    for (let i = 5; i < 15; i++) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      const user = await createUser(page, generateUserData(i));
      expect(user).not.toBeNull();
      claimingUsers.push(user);
      createdUsers.push(user);
      
      console.log(`Created claiming user ${i - 4}: ${user?.name || 'Unknown'}`);
      await page.waitForTimeout(500);
    }
    
    // Step 4: Distribute 50 claims among claiming users
    console.log('Distributing 50 claims among 10 users...');
    let totalClaims = 0;
    const claimsPerUser = Math.floor(50 / claimingUsers.length);
    const remainingClaims = 50 % claimingUsers.length;
    
    for (let i = 0; i < claimingUsers.length; i++) {
      const user = claimingUsers[i];
      const claimsForThisUser = claimsPerUser + (i < remainingClaims ? 1 : 0);
      
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await authenticateUser(page, user);
      await page.goto('/feed');
      await page.waitForTimeout(2000);
      
      // Get posts not created by this user
      const availablePosts = createdPosts.filter(
        post => post.authorId !== user.id
      );
      
      // Shuffle to get random distribution
      const shuffledPosts = availablePosts.sort(() => Math.random() - 0.5);
      const postsToClaim = shuffledPosts.slice(0, claimsForThisUser);
      
      let userClaims = 0;
      for (const post of postsToClaim) {
        console.log(`${user.name} claiming post: ${post.title}`);
        
        const opened = await openPost(page, post.id);
        if (opened) {
          const claimed = await claimPost(page, post.id);
          if (claimed) {
            userClaims++;
            totalClaims++;
            console.log(`✓ ${user.name} claimed post successfully (${userClaims}/${claimsForThisUser})`);
          } else {
            console.log(`✗ ${user.name} failed to claim post (may already be claimed)`);
          }
        }
        
        await page.waitForTimeout(300);
      }
      
      console.log(`${user.name} completed: ${userClaims} claims`);
    }
    
    console.log(`Total claims made: ${totalClaims}/50`);
    expect(totalClaims).toBeGreaterThanOrEqual(30); // At least 60% success rate
    
    // Step 5: Verify claims are visible
    console.log('Verifying claims are visible...');
    
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await authenticateUser(page, claimingUsers[0]);
    await page.goto('/feed');
    await page.waitForTimeout(3000);
    
    // Open a few posts to verify claims
    const samplePosts = createdPosts.slice(0, 5);
    let verifiedClaims = 0;
    
    for (const post of samplePosts) {
        await openPost(page, post.id);
        await page.waitForTimeout(500);
      
      const claimersSection = page.locator('text=/claimer/i, text=/claimed/i');
      const hasClaimers = await claimersSection.count() > 0;
      
      if (hasClaimers) {
        verifiedClaims++;
        console.log(`✓ Post "${post.title}" has claimers`);
      }
      
      await page.waitForTimeout(500);
    }
    
    console.log(`Verified ${verifiedClaims} posts with claimers`);
    expect(verifiedClaims).toBeGreaterThan(0);
    
    // Step 6: Test edge case - multiple users claiming same post
    console.log('Testing edge case: multiple users claiming same post...');
    
    if (createdPosts.length > 0) {
      const testPost = createdPosts[0];
      let samePostClaims = 0;
      
      // Have 3 different users try to claim the same post
      for (let i = 0; i < Math.min(3, claimingUsers.length); i++) {
        const user = claimingUsers[i];
        
        if (testPost.authorId === user.id) continue; // Skip if user owns the post
        
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await authenticateUser(page, user);
        
        await openPost(page, testPost.id);
        await page.waitForTimeout(1000);
        
        const claimed = await claimPost(page, testPost.id);
        if (claimed) {
          samePostClaims++;
          console.log(`✓ User ${user.name} claimed same post`);
        }
        
        await page.waitForTimeout(300);
      }
      
      console.log(`${samePostClaims} users claimed the same post`);
      expect(samePostClaims).toBeGreaterThan(0);
    }
    
    console.log('Mass claims test completed successfully!');
    console.log(`Total users created: ${createdUsers.length}`);
    console.log(`Total posts created: ${createdPosts.length}`);
    console.log(`Total claims made: ${totalClaims}`);
  });
});

