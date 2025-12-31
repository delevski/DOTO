/**
 * Message Helper Functions for Playwright Tests
 * Handles sending messages, opening conversations, and verification
 */

import { expect } from '@playwright/test';

/**
 * Navigate to messages page
 * @param {object} page - Playwright page object
 */
export async function goToMessages(page) {
  await page.goto('/messages');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Open a conversation by conversation ID
 * @param {object} page - Playwright page object
 * @param {string} conversationId - Conversation ID
 * @returns {boolean} - True if opened successfully
 */
export async function openConversation(page, conversationId) {
  try {
    await page.goto(`/messages?conversation=${conversationId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify conversation loaded
    const messageArea = page.locator('[class*="message"], [class*="chat"]').first();
    return await messageArea.count() > 0;
  } catch (error) {
    console.warn(`Failed to open conversation ${conversationId}:`, error.message);
    return false;
  }
}

/**
 * Open a conversation with a specific user
 * @param {object} page - Playwright page object
 * @param {string} userName - User name to open conversation with
 * @returns {boolean} - True if opened successfully
 */
export async function openConversationWithUser(page, userName) {
  try {
    await goToMessages(page);

    // Find conversation in list by user name
    const conversationItem = page.locator(`text=${userName}`).first();
    
    if (await conversationItem.count() > 0) {
      await conversationItem.click();
      await page.waitForTimeout(1000);
      return true;
    }

    return false;
  } catch (error) {
    console.warn(`Failed to open conversation with ${userName}:`, error.message);
    return false;
  }
}

/**
 * Send a message in the current conversation
 * @param {object} page - Playwright page object
 * @param {string} messageText - Message text to send
 * @returns {boolean} - True if sent successfully
 */
export async function sendMessage(page, messageText) {
  try {
    // Find message input
    const messageInput = page.locator([
      'input[placeholder*="message" i]',
      'input[placeholder*="type" i]',
      'textarea[placeholder*="message" i]',
      '[class*="message"] input',
      '[class*="chat"] input',
      '[class*="composer"] input',
      '[class*="composer"] textarea'
    ].join(', ')).first();

    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill(messageText);
    await page.waitForTimeout(200);

    // Find and click send button
    const sendButton = page.locator([
      'button:has-text("send")',
      'button:has-text("שלח")',
      'button[type="submit"]',
      '[class*="send"] button',
      'button:has([class*="send"])',
      'button svg[class*="send"]'
    ].join(', ')).first();

    if (await sendButton.count() > 0) {
      await sendButton.click();
      await page.waitForTimeout(1000);
      return true;
    }

    // Fallback: press Enter
    await messageInput.press('Enter');
    await page.waitForTimeout(1000);
    return true;
  } catch (error) {
    console.warn('Failed to send message:', error.message);
    return false;
  }
}

/**
 * Send a message to a conversation by ID
 * @param {object} page - Playwright page object
 * @param {string} conversationId - Conversation ID
 * @param {string} messageText - Message text to send
 * @returns {boolean} - True if sent successfully
 */
export async function sendMessageToConversation(page, conversationId, messageText) {
  const opened = await openConversation(page, conversationId);
  if (!opened) {
    return false;
  }
  
  return await sendMessage(page, messageText);
}

/**
 * Initiate a new conversation from a post
 * @param {object} page - Playwright page object
 * @param {string} postId - Post ID
 * @param {string} initialMessage - Optional initial message to send
 * @returns {string|null} - Conversation ID or null
 */
export async function initiateConversationFromPost(page, postId, initialMessage = null) {
  try {
    // Go to post
    await page.goto(`/post/${postId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Find message/contact button
    const messageButton = page.locator([
      'button:has-text("message")',
      'button:has-text("contact")',
      'button:has-text("הודעה")',
      'a:has-text("message")',
      '[class*="message"] button'
    ].join(', ')).first();

    if (await messageButton.count() === 0) {
      console.log('No message button found on post');
      return null;
    }

    await messageButton.click();
    await page.waitForTimeout(2000);

    // Should be on messages page now
    const currentUrl = page.url();
    
    if (currentUrl.includes('/messages')) {
      // Extract conversation ID from URL
      const match = currentUrl.match(/conversation=([^&]+)/);
      const conversationId = match ? match[1] : null;

      // Send initial message if provided
      if (initialMessage) {
        await sendMessage(page, initialMessage);
      }

      return conversationId;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to initiate conversation from post ${postId}:`, error.message);
    return null;
  }
}

/**
 * Verify a message exists in a conversation
 * @param {object} page - Playwright page object
 * @param {string} messageText - Message text to verify (partial match)
 * @returns {boolean} - True if message found
 */
export async function verifyMessage(page, messageText) {
  try {
    const message = page.locator(`text=${messageText}`).first();
    return await message.count() > 0;
  } catch (error) {
    console.warn('Failed to verify message:', error.message);
    return false;
  }
}

/**
 * Get all messages in current conversation
 * @param {object} page - Playwright page object
 * @returns {Array} - Array of message objects
 */
export async function getMessages(page) {
  try {
    const messages = await page.evaluate(() => {
      const messageElements = document.querySelectorAll('[class*="message-item"], [class*="message-bubble"], [data-message]');
      
      return Array.from(messageElements).map((el, index) => {
        const textEl = el.querySelector('p, [class*="text"], [class*="content"]');
        const senderEl = el.querySelector('[class*="sender"], [class*="author"]');
        const timeEl = el.querySelector('[class*="time"], time');
        
        return {
          index,
          text: textEl?.textContent?.trim() || el.textContent?.trim().substring(0, 200),
          sender: senderEl?.textContent?.trim(),
          time: timeEl?.textContent?.trim(),
          isMine: el.className.includes('mine') || el.className.includes('sent') || el.className.includes('right')
        };
      });
    });

    return messages;
  } catch (error) {
    console.warn('Failed to get messages:', error.message);
    return [];
  }
}

/**
 * Get all conversations for current user
 * @param {object} page - Playwright page object
 * @returns {Array} - Array of conversation objects
 */
export async function getConversations(page) {
  try {
    await goToMessages(page);

    const conversations = await page.evaluate(() => {
      const conversationElements = document.querySelectorAll('[class*="conversation"], [class*="chat-item"], [data-conversation]');
      
      return Array.from(conversationElements).map((el, index) => {
        const nameEl = el.querySelector('[class*="name"], strong, h3, h4');
        const previewEl = el.querySelector('[class*="preview"], [class*="last-message"], p');
        const avatarEl = el.querySelector('img');
        const linkEl = el.querySelector('a');
        
        let conversationId = null;
        if (linkEl) {
          const href = linkEl.getAttribute('href');
          const match = href?.match(/conversation=([^&]+)/);
          conversationId = match ? match[1] : null;
        }

        return {
          index,
          name: nameEl?.textContent?.trim(),
          preview: previewEl?.textContent?.trim(),
          avatar: avatarEl?.src,
          conversationId
        };
      });
    });

    return conversations;
  } catch (error) {
    console.warn('Failed to get conversations:', error.message);
    return [];
  }
}

/**
 * Check for unread messages
 * @param {object} page - Playwright page object
 * @returns {number} - Number of unread messages/conversations
 */
export async function getUnreadCount(page) {
  try {
    await goToMessages(page);

    const unreadCount = await page.evaluate(() => {
      // Look for unread indicators
      const unreadBadges = document.querySelectorAll('[class*="unread"], [class*="badge"]');
      let count = 0;

      unreadBadges.forEach(badge => {
        const text = badge.textContent?.trim();
        const num = parseInt(text, 10);
        if (!isNaN(num)) {
          count += num;
        } else if (badge.className.includes('unread')) {
          count += 1;
        }
      });

      return count;
    });

    return unreadCount;
  } catch (error) {
    console.warn('Failed to get unread count:', error.message);
    return 0;
  }
}

/**
 * Mark conversation as read
 * @param {object} page - Playwright page object
 * @param {string} conversationId - Conversation ID to mark as read
 * @returns {boolean} - True if marked successfully
 */
export async function markConversationAsRead(page, conversationId) {
  try {
    // Opening a conversation typically marks it as read
    await openConversation(page, conversationId);
    await page.waitForTimeout(1000);
    return true;
  } catch (error) {
    console.warn(`Failed to mark conversation ${conversationId} as read:`, error.message);
    return false;
  }
}

/**
 * Generate a conversation ID from two user IDs
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {string} - Conversation ID
 */
export function generateConversationId(userId1, userId2) {
  // Sort IDs to ensure consistent conversation ID
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

/**
 * Generate test message text
 * @param {string} senderName - Sender name
 * @param {number} index - Message index for variation
 * @returns {string} - Generated message text
 */
export function generateMessageText(senderName = 'User', index = 0) {
  const messages = [
    `Hi there! This is ${senderName}. How can I help?`,
    `Hello! I saw your post and I'm interested.`,
    `Thanks for reaching out! When are you available?`,
    `Great, let me know the details.`,
    `I can help with that. What time works for you?`,
    `Sounds good! Let's coordinate.`,
    `Perfect, I'll be there.`,
    `Thanks! Looking forward to it.`,
    `No problem, happy to assist!`,
    `Let me know if you need anything else.`
  ];

  return messages[index % messages.length];
}

