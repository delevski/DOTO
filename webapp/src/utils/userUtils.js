import { db } from '../lib/instant';

/**
 * Find a user by email address, checking both email and emailLower fields
 * @param {string} targetEmail - The email address to search for
 * @returns {Promise<Object|null>} - The user object if found, null otherwise
 */
export const findUserByEmail = async (targetEmail) => {
  if (!targetEmail) return null;
  const trimmed = targetEmail.trim();
  const normalized = trimmed.toLowerCase();

  try {
    // First try to find by emailLower (normalized)
    const { data: dataByLower } = await db.query({
      users: {
        $: {
          where: { emailLower: normalized }
        }
      }
    });

    const userByLower = dataByLower?.users?.[0];
    if (userByLower) {
      return userByLower;
    }

    // Fallback to exact email match (case-sensitive)
    const { data: dataByEmail } = await db.query({
      users: {
        $: {
          where: { email: trimmed }
        }
      }
    });

    return dataByEmail?.users?.[0] || null;
  } catch (err) {
    console.error('Error querying user by email:', err);
    throw err;
  }
};

