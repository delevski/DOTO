/**
 * Notification Helper Functions for Playwright Tests
 * Handles checking notifications, verifying notification content, and related operations
 */

import { expect } from '@playwright/test';

/**
 * Navigate to notifications page
 * @param {object} page - Playwright page object
 */
export async function goToNotifications(page) {
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Get unread notification count from badge
 * @param {object} page - Playwright page object
 * @returns {number} - Unread notification count
 */
export async function getUnreadNotificationCount(page) {
  try {
    const count = await page.evaluate(() => {
      // Look for notification badge in header/nav
      const badges = document.querySelectorAll('[class*="notification"] [class*="badge"], [class*="badge"]');
      
      for (const badge of badges) {
        const text = badge.textContent?.trim();
        const num = parseInt(text, 10);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }

      // Try looking for specific notification count elements
      const notificationCount = document.querySelector('[class*="notification-count"], [data-notification-count]');
      if (notificationCount) {
        const num = parseInt(notificationCount.textContent?.trim(), 10);
        if (!isNaN(num)) return num;
      }

      return 0;
    });

    return count;
  } catch (error) {
    console.warn('Failed to get unread notification count:', error.message);
    return 0;
  }
}

/**
 * Get all notifications
 * @param {object} page - Playwright page object
 * @returns {Array} - Array of notification objects
 */
export async function getNotifications(page) {
  try {
    await goToNotifications(page);

    const notifications = await page.evaluate(() => {
      const notificationElements = document.querySelectorAll('[class*="notification-item"], [class*="notification-card"], [data-notification]');
      
      return Array.from(notificationElements).map((el, index) => {
        const messageEl = el.querySelector('[class*="message"], p, [class*="text"]');
        const timeEl = el.querySelector('[class*="time"], time');
        const typeEl = el.querySelector('[class*="type"], [class*="icon"]');
        
        return {
          index,
          message: messageEl?.textContent?.trim() || el.textContent?.trim().substring(0, 200),
          time: timeEl?.textContent?.trim(),
          type: typeEl?.getAttribute('data-type') || typeEl?.className,
          isRead: el.className.includes('read') || !el.className.includes('unread'),
          fullText: el.textContent?.trim()
        };
      });
    });

    return notifications;
  } catch (error) {
    console.warn('Failed to get notifications:', error.message);
    return [];
  }
}

/**
 * Check if a notification exists with specific text
 * @param {object} page - Playwright page object
 * @param {string} searchText - Text to search for in notifications
 * @returns {boolean} - True if notification found
 */
export async function hasNotification(page, searchText) {
  try {
    await goToNotifications(page);

    const notification = page.locator(`text=${searchText}`).first();
    return await notification.count() > 0;
  } catch (error) {
    console.warn('Failed to check for notification:', error.message);
    return false;
  }
}

/**
 * Verify a specific notification type exists
 * @param {object} page - Playwright page object
 * @param {string} type - Notification type (e.g., 'claim', 'message', 'comment')
 * @returns {boolean} - True if notification of type exists
 */
export async function hasNotificationType(page, type) {
  try {
    await goToNotifications(page);

    const typePatterns = {
      'claim': /claim|wants to help|תביעה/i,
      'message': /message|sent you|הודעה/i,
      'comment': /comment|replied|תגובה/i,
      'approved': /approved|selected|אושר/i
    };

    const pattern = typePatterns[type.toLowerCase()] || new RegExp(type, 'i');

    const notifications = await getNotifications(page);
    return notifications.some(n => pattern.test(n.fullText));
  } catch (error) {
    console.warn(`Failed to check for notification type ${type}:`, error.message);
    return false;
  }
}

/**
 * Mark a notification as read
 * @param {object} page - Playwright page object
 * @param {number} notificationIndex - Index of notification to mark as read
 * @returns {boolean} - True if marked successfully
 */
export async function markNotificationAsRead(page, notificationIndex = 0) {
  try {
    await goToNotifications(page);

    const notifications = page.locator('[class*="notification-item"], [class*="notification-card"], [data-notification]');
    
    if (await notifications.count() > notificationIndex) {
      // Click on notification to mark as read (most apps mark on click)
      await notifications.nth(notificationIndex).click();
      await page.waitForTimeout(500);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Failed to mark notification as read:', error.message);
    return false;
  }
}

/**
 * Mark all notifications as read
 * @param {object} page - Playwright page object
 * @returns {boolean} - True if marked successfully
 */
export async function markAllNotificationsAsRead(page) {
  try {
    await goToNotifications(page);

    // Look for "Mark all as read" button
    const markAllButton = page.locator([
      'button:has-text("mark all")',
      'button:has-text("read all")',
      'button:has-text("סמן הכל")',
      '[class*="mark-all"]'
    ].join(', ')).first();

    if (await markAllButton.count() > 0) {
      await markAllButton.click();
      await page.waitForTimeout(500);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Failed to mark all notifications as read:', error.message);
    return false;
  }
}

/**
 * Click on a notification to navigate to related content
 * @param {object} page - Playwright page object
 * @param {number} notificationIndex - Index of notification to click
 * @returns {string|null} - URL navigated to or null
 */
export async function clickNotification(page, notificationIndex = 0) {
  try {
    await goToNotifications(page);

    const notifications = page.locator('[class*="notification-item"], [class*="notification-card"], [data-notification]');
    
    if (await notifications.count() > notificationIndex) {
      await notifications.nth(notificationIndex).click();
      await page.waitForTimeout(1500);
      
      const currentUrl = page.url();
      // Check if navigated away from notifications
      if (!currentUrl.includes('/notifications')) {
        return currentUrl;
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to click notification:', error.message);
    return null;
  }
}

/**
 * Delete a notification (if delete functionality exists)
 * @param {object} page - Playwright page object
 * @param {number} notificationIndex - Index of notification to delete
 * @returns {boolean} - True if deleted successfully
 */
export async function deleteNotification(page, notificationIndex = 0) {
  try {
    await goToNotifications(page);

    const notifications = page.locator('[class*="notification-item"], [class*="notification-card"]');
    
    if (await notifications.count() > notificationIndex) {
      // Look for delete button within notification
      const deleteButton = notifications.nth(notificationIndex).locator('button:has-text("delete"), button:has-text("מחק"), [class*="delete"]').first();
      
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(500);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn('Failed to delete notification:', error.message);
    return false;
  }
}

/**
 * Wait for a notification to appear
 * @param {object} page - Playwright page object
 * @param {string} searchText - Text to wait for in notifications
 * @param {number} timeout - Timeout in milliseconds (default 10000)
 * @returns {boolean} - True if notification appeared
 */
export async function waitForNotification(page, searchText, timeout = 10000) {
  try {
    await goToNotifications(page);

    const notification = page.locator(`text=${searchText}`).first();
    await expect(notification).toBeVisible({ timeout });
    return true;
  } catch (error) {
    console.warn(`Notification with text "${searchText}" did not appear:`, error.message);
    return false;
  }
}

/**
 * Clear all notifications (if clear functionality exists)
 * @param {object} page - Playwright page object
 * @returns {boolean} - True if cleared successfully
 */
export async function clearAllNotifications(page) {
  try {
    await goToNotifications(page);

    const clearButton = page.locator([
      'button:has-text("clear all")',
      'button:has-text("delete all")',
      'button:has-text("נקה הכל")',
      '[class*="clear-all"]'
    ].join(', ')).first();

    if (await clearButton.count() > 0) {
      await clearButton.click();
      await page.waitForTimeout(500);

      // Confirm if dialog appears
      const confirmButton = page.locator('button:has-text("confirm"), button:has-text("yes"), button:has-text("אישור")').first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(500);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.warn('Failed to clear all notifications:', error.message);
    return false;
  }
}

/**
 * Check notification badge visibility
 * @param {object} page - Playwright page object
 * @returns {boolean} - True if badge is visible with count > 0
 */
export async function isNotificationBadgeVisible(page) {
  try {
    const badge = page.locator('[class*="notification"] [class*="badge"]:visible').first();
    
    if (await badge.count() > 0) {
      const text = await badge.textContent();
      const count = parseInt(text?.trim(), 10);
      return !isNaN(count) && count > 0;
    }

    return false;
  } catch (error) {
    console.warn('Failed to check notification badge:', error.message);
    return false;
  }
}

/**
 * Get notification details from notifications page
 * @param {object} page - Playwright page object
 * @param {number} index - Notification index
 * @returns {object|null} - Notification details or null
 */
export async function getNotificationDetails(page, index = 0) {
  const notifications = await getNotifications(page);
  return notifications[index] || null;
}

