/**
 * Comment Helper Functions for Playwright Tests
 * Handles adding comments, verifying comments, and related operations
 */

import { expect } from '@playwright/test';

/**
 * Add a comment to a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID to comment on
 * @param {string} commentText - Comment text to add
 * @returns {boolean} - True if comment added successfully
 */
export async function addComment(page, postId, commentText) {
  try {
    // Navigate to post details
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Scroll to comments section
    const commentSection = page.locator('#comments-section, [class*="comment"]').first();
    if (await commentSection.count() > 0) {
      await commentSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }

    // Find comment input
    const commentInput = page.locator([
      '#comment-input',
      'input[placeholder*="comment" i]',
      'input[placeholder*="write" i]',
      'textarea[placeholder*="comment" i]',
      '[class*="comment"] input',
      '[class*="comment"] textarea'
    ].join(', ')).first();

    await expect(commentInput).toBeVisible({ timeout: 5000 });
    await commentInput.fill(commentText);
    await page.waitForTimeout(300);

    // Try to submit - look for send button first
    const sendButton = page.locator([
      'button:has-text("send")',
      'button:has-text("שלח")',
      'button[type="submit"]',
      '[class*="comment"] button',
      'button:has([class*="send"])'
    ].join(', ')).first();

    const sendButtonCount = await sendButton.count();
    if (sendButtonCount > 0) {
      const isDisabled = await sendButton.isDisabled().catch(() => true);
      if (!isDisabled) {
        await sendButton.click();
        await page.waitForTimeout(1000);
        return true;
      }
    }

    // Fallback: press Enter
    await commentInput.press('Enter');
    await page.waitForTimeout(1000);
    return true;
  } catch (error) {
    console.warn(`Failed to add comment to post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Verify a comment exists on a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @param {string} commentText - Comment text to verify (partial match)
 * @returns {boolean} - True if comment found
 */
export async function verifyComment(page, postId, commentText) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Look for comment text
    const comment = page.locator(`text=${commentText}`).first();
    const found = await comment.count() > 0;

    return found;
  } catch (error) {
    console.warn(`Failed to verify comment on post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Get all comments on a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @returns {Array} - Array of comment objects
 */
export async function getComments(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const comments = await page.evaluate(() => {
      const commentElements = document.querySelectorAll('[class*="comment"], [data-comment]');
      
      return Array.from(commentElements)
        .filter(el => !el.className.includes('input') && !el.className.includes('form'))
        .map((el, index) => {
          // Try to find author and text within the comment element
          const authorEl = el.querySelector('[class*="author"], [class*="name"], strong');
          const textEl = el.querySelector('p, [class*="text"], [class*="content"]');
          const timeEl = el.querySelector('[class*="time"], time');
          
          return {
            index,
            author: authorEl?.textContent?.trim(),
            text: textEl?.textContent?.trim() || el.textContent?.trim().substring(0, 200),
            time: timeEl?.textContent?.trim()
          };
        });
    });

    return comments;
  } catch (error) {
    console.warn(`Failed to get comments for post ${postId}:`, error.message);
    return [];
  }
}

/**
 * Get comment count for a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @returns {number} - Number of comments
 */
export async function getCommentCount(page, postId) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Try to find comment count from header/badge
    const countText = await page.evaluate(() => {
      // Look for patterns like "Comments (5)" or "5 comments"
      const text = document.body.textContent || '';
      const match = text.match(/comments?\s*\((\d+)\)/i) || 
                    text.match(/(\d+)\s*comments?/i);
      return match ? parseInt(match[1], 10) : null;
    });

    if (countText !== null) {
      return countText;
    }

    // Fall back to counting comment elements
    const comments = await getComments(page, postId);
    return comments.length;
  } catch (error) {
    console.warn(`Failed to get comment count for post ${postId}:`, error.message);
    return 0;
  }
}

/**
 * Delete a comment (if user is author)
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @param {number} commentIndex - Index of comment to delete
 * @returns {boolean} - True if deleted successfully
 */
export async function deleteComment(page, postId, commentIndex = 0) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Find comment elements
    const commentElements = page.locator('[class*="comment"]').filter({
      has: page.locator('button:has-text("delete"), button:has-text("מחק")')
    });

    if (await commentElements.count() > commentIndex) {
      const deleteButton = commentElements.nth(commentIndex).locator('button:has-text("delete"), button:has-text("מחק")').first();
      await deleteButton.click();
      await page.waitForTimeout(1000);

      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("confirm"), button:has-text("yes"), button:has-text("אישור")').first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(500);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.warn(`Failed to delete comment on post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Reply to a comment (if reply functionality exists)
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @param {number} commentIndex - Index of comment to reply to
 * @param {string} replyText - Reply text
 * @returns {boolean} - True if replied successfully
 */
export async function replyToComment(page, postId, commentIndex, replyText) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Find reply button on the comment
    const commentElements = page.locator('[class*="comment"]').filter({
      hasNot: page.locator('input, textarea')
    });

    if (await commentElements.count() > commentIndex) {
      const replyButton = commentElements.nth(commentIndex).locator('button:has-text("reply"), button:has-text("השב")').first();
      
      if (await replyButton.count() > 0) {
        await replyButton.click();
        await page.waitForTimeout(500);

        // Find reply input that appeared
        const replyInput = page.locator('input:visible, textarea:visible').last();
        await replyInput.fill(replyText);
        await page.waitForTimeout(200);

        // Submit reply
        await replyInput.press('Enter');
        await page.waitForTimeout(1000);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn(`Failed to reply to comment on post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Like a comment (if like functionality exists)
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @param {number} commentIndex - Index of comment to like
 * @returns {boolean} - True if liked successfully
 */
export async function likeComment(page, postId, commentIndex = 0) {
  try {
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const commentElements = page.locator('[class*="comment"]').filter({
      hasNot: page.locator('input, textarea')
    });

    if (await commentElements.count() > commentIndex) {
      const likeButton = commentElements.nth(commentIndex).locator('button:has-text("like"), button[class*="like"]').first();
      
      if (await likeButton.count() > 0) {
        await likeButton.click();
        await page.waitForTimeout(500);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn(`Failed to like comment on post ${postId}:`, error.message);
    return false;
  }
}

/**
 * Generate a random comment text for testing
 * @param {string} userName - User name to include
 * @param {number} index - Comment index for variation
 * @returns {string} - Generated comment text
 */
export function generateCommentText(userName = 'User', index = 0) {
  const comments = [
    `Great post! I'd love to help with this. - ${userName}`,
    `This looks interesting! Count me in. - ${userName}`,
    `I have experience with this. Happy to assist! - ${userName}`,
    `When do you need this done? - ${userName}`,
    `I'm available this weekend. - ${userName}`,
    `What's the best time to help? - ${userName}`,
    `Is this still available? - ${userName}`,
    `I can help with this task. - ${userName}`,
    `Let me know if you still need assistance. - ${userName}`,
    `Happy to lend a hand! - ${userName}`
  ];

  return comments[index % comments.length];
}

