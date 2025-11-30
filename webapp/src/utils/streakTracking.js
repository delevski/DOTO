import { db } from '../lib/instant';

/**
 * Check if two dates are on the same day
 */
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date1 is exactly one day before date2
 */
function isConsecutiveDay(date1, date2) {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diff = date2.getTime() - date1.getTime();
  // Allow for some variance (between 12-36 hours) to account for timezone issues
  return diff >= oneDayMs * 0.5 && diff <= oneDayMs * 1.5;
}

/**
 * Update user's activity streak
 * Call this function whenever a user performs an activity (post, claim, complete, comment)
 * 
 * @param {string} userId - The user's ID
 * @param {Object} currentUserData - Current user data from the store (optional, for optimistic updates)
 * @returns {Promise<{currentStreak: number, longestStreak: number}>}
 */
export async function updateUserStreak(userId, currentUserData = null) {
  if (!userId) return { currentStreak: 0, longestStreak: 0 };

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get current user streak data from database
    const { data } = await db.queryOnce({
      users: {
        $: {
          where: { id: userId }
        }
      }
    });

    const user = data?.users?.[0] || currentUserData;
    
    if (!user) {
      // If no user found, initialize streak
      await db.transact(
        db.tx.users[userId].update({
          lastActivityDate: now.getTime(),
          currentStreak: 1,
          longestStreak: 1
        })
      );
      return { currentStreak: 1, longestStreak: 1 };
    }

    const lastActivityDate = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    let currentStreak = user.currentStreak || 0;
    let longestStreak = user.longestStreak || 0;

    if (!lastActivityDate) {
      // First activity ever
      currentStreak = 1;
      longestStreak = Math.max(longestStreak, 1);
    } else {
      const lastActivityDay = new Date(
        lastActivityDate.getFullYear(),
        lastActivityDate.getMonth(),
        lastActivityDate.getDate()
      );

      if (isSameDay(lastActivityDay, today)) {
        // Already had activity today, no streak update needed
        return { currentStreak, longestStreak };
      } else if (isConsecutiveDay(lastActivityDay, today)) {
        // Consecutive day, increment streak
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        // Streak broken, reset to 1
        currentStreak = 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      }
    }

    // Update user's streak data
    await db.transact(
      db.tx.users[userId].update({
        lastActivityDate: now.getTime(),
        currentStreak,
        longestStreak
      })
    );

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Error updating user streak:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Get user's current streak data without updating
 * @param {string} userId 
 * @returns {Promise<{currentStreak: number, longestStreak: number, lastActivityDate: number}>}
 */
export async function getUserStreakData(userId) {
  if (!userId) return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };

  try {
    const { data } = await db.queryOnce({
      users: {
        $: {
          where: { id: userId }
        }
      }
    });

    const user = data?.users?.[0];
    
    if (!user) {
      return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    // Check if streak should be reset (more than 1 day since last activity)
    const lastActivityDate = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    let currentStreak = user.currentStreak || 0;
    const longestStreak = user.longestStreak || 0;

    if (lastActivityDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastActivityDay = new Date(
        lastActivityDate.getFullYear(),
        lastActivityDate.getMonth(),
        lastActivityDate.getDate()
      );

      // If more than 1 day has passed and it's not today, streak would be broken
      if (!isSameDay(lastActivityDay, today) && !isConsecutiveDay(lastActivityDay, today)) {
        currentStreak = 0; // Streak is broken but we don't update until next activity
      }
    }

    return {
      currentStreak,
      longestStreak,
      lastActivityDate: user.lastActivityDate
    };
  } catch (error) {
    console.error('Error getting user streak data:', error);
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  }
}

