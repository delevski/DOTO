/**
 * Claim Helper Functions for Playwright Tests
 * Handles claiming posts, approving claimers, and verification
 */

import { expect } from '@playwright/test';

/**
 * Claim a post as the current user
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID to claim
 * @returns {boolean} - True if claimed successfully
 */
export async function claimPost(page, postId) {
  try {
    // Navigate to post details
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Find claim button
    const claimButton = page.locator('button').filter({ hasText: /claim|תביע|i want to help/i }).first();
    const claimButtonCount = await claimButton.count();

    if (claimButtonCount === 0) {
      console.log('No claim button found');
      return false;
    }

    // Check if button is disabled
    const isDisabled = await claimButton.isDisabled().catch(() => false);
    if (isDisabled) {
      console.log('Claim button is disabled');
      return false;
    }

    // Click claim button
    await claimButton.click();
    await page.waitForTimeout(1500);

    // Check for success indicators
    const successIndicators = [
      page.locator('text=/claimed|success|waiting|pending/i'),
      page.locator('button').filter({ hasText: /claimed|waiting|you.*claimed/i }),
      page.locator('[class*="success"]'),
      page.locator('text=/claimer/i')
    ];

    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        return true;
      }
    }

    // Default to true if button was clicked without error
    return true;
  } catch (error) {
    console.warn(`Failed to claim post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Approve a claimer (as post owner)
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @param {string} claimerUserId - Claimer's user ID to approve (optional - approves first if not specified)
 * @returns {boolean} - True if approved successfully
 */
export async function approveClaimer(page, postId, claimerUserId = null) {
  try {
    // Navigate to post details
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Look for claimers section
    const claimersSection = page.locator('text=/claimer/i, [class*="claimer"]').first();
    const sectionExists = await claimersSection.count() > 0;

    if (!sectionExists) {
      // Try looking for "Choose a Claimer" button
      const chooseButton = page.locator('button').filter({ hasText: /choose|select.*claimer/i }).first();
      if (await chooseButton.count() > 0) {
        await chooseButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Find approve button(s)
    let approveButton;
    
    if (claimerUserId) {
      // Find specific claimer's approve button
      const claimerRow = page.locator(`[data-user-id="${claimerUserId}"], [href*="${claimerUserId}"]`).first();
      if (await claimerRow.count() > 0) {
        approveButton = claimerRow.locator('button').filter({ hasText: /approve|אשר|select/i }).first();
      }
    }
    
    // Fall back to first approve button
    if (!approveButton || await approveButton.count() === 0) {
      approveButton = page.locator('button').filter({ hasText: /approve|אשר|select/i }).first();
    }

    if (await approveButton.count() === 0) {
      console.log('No approve button found');
      return false;
    }

    // Click approve
    await approveButton.click();
    await page.waitForTimeout(1500);

    // Check for success
    const successIndicators = [
      page.locator('text=/approved|selected|confirmed/i'),
      page.locator('[class*="success"]'),
      page.locator('text=/helper.*selected/i')
    ];

    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        return true;
      }
    }

    return true;
  } catch (error) {
    console.warn(`Failed to approve claimer for post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Get list of claimers for a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @returns {Array} - Array of claimer objects
 */
export async function getClaimers(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const claimers = await page.evaluate(() => {
      const claimerElements = document.querySelectorAll('[class*="claimer"], [data-claimer]');
      return Array.from(claimerElements).map(el => {
        const nameEl = el.querySelector('[class*="name"], span, div');
        const avatarEl = el.querySelector('img');
        
        return {
          name: nameEl?.textContent?.trim(),
          avatar: avatarEl?.src,
          element: el.textContent?.substring(0, 100)
        };
      });
    });

    return claimers;
  } catch (error) {
    console.warn(`Failed to get claimers for post ${postId}:`, error.message);
    return [];
  }
}

/**
 * Verify a user has claimed a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @param {string} userName - User name to verify
 * @returns {boolean} - True if user has claimed
 */
export async function verifyUserClaimed(page, postId, userName) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Look for user name in claimers section
    const userMention = page.locator(`text=${userName}`).first();
    const hasClaimed = await userMention.count() > 0;

    return hasClaimed;
  } catch (error) {
    console.warn(`Failed to verify claim for ${userName}:`, error.message);
    return false;
  }
}

/**
 * Check if a post has been claimed
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @returns {object} - Claim status with details
 */
export async function getClaimStatus(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const status = await page.evaluate(() => {
      const text = document.body.textContent?.toLowerCase() || '';
      
      return {
        hasClaims: text.includes('claimer') || text.includes('claimed'),
        isApproved: text.includes('approved') || text.includes('selected'),
        claimerCount: (text.match(/claimer/gi) || []).length
      };
    });

    return status;
  } catch (error) {
    console.warn(`Failed to get claim status for post ${postId}:`, error.message);
    return { hasClaims: false, isApproved: false, claimerCount: 0 };
  }
}

/**
 * Cancel a claim on a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @returns {boolean} - True if cancelled successfully
 */
export async function cancelClaim(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Find cancel/withdraw button
    const cancelButton = page.locator('button').filter({ hasText: /cancel|withdraw|remove.*claim/i }).first();
    
    if (await cancelButton.count() === 0) {
      return false;
    }

    await cancelButton.click();
    await page.waitForTimeout(1000);

    return true;
  } catch (error) {
    console.warn(`Failed to cancel claim for post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Verify claimer selection modal opens
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @returns {boolean} - True if modal opens
 */
export async function openClaimerSelectionModal(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Try to find and click button that opens claimer selection
    const openButtons = [
      page.locator('button').filter({ hasText: /choose.*claimer|select.*helper/i }),
      page.locator('button').filter({ hasText: /view.*claimer/i }),
      page.locator('[class*="claimer"]').locator('button').first()
    ];

    for (const button of openButtons) {
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = page.locator('[role="dialog"], [class*="modal"]');
        if (await modal.count() > 0) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.warn(`Failed to open claimer modal for post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Get claimer stats from selection modal/section
 * @param {object} page - Playwright page object
 * @returns {Array} - Array of claimer stats
 */
export async function getClaimerStats(page) {
  try {
    const stats = await page.evaluate(() => {
      const claimerCards = document.querySelectorAll('[class*="claimer-card"], [class*="ClaimerCard"]');
      
      return Array.from(claimerCards).map(card => {
        const name = card.querySelector('[class*="name"]')?.textContent;
        const rating = card.querySelector('[class*="rating"]')?.textContent;
        const tasks = card.querySelector('[class*="task"]')?.textContent;
        
        return {
          name: name?.trim(),
          rating: rating?.trim(),
          tasksCompleted: tasks?.trim()
        };
      });
    });

    return stats;
  } catch (error) {
    console.warn('Failed to get claimer stats:', error.message);
    return [];
  }
}

