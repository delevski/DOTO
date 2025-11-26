/**
 * Password utility functions using Web Crypto API
 */

/**
 * Hash a password using SHA-256 with a salt
 * @param {string} password - The plain text password
 * @param {string} salt - Optional salt (if not provided, one will be generated)
 * @returns {Promise<{hash: string, salt: string}>} - The password hash and salt
 */
export async function hashPassword(password, salt = null) {
  // Generate a random salt if not provided
  if (!salt) {
    const saltArray = new Uint8Array(16);
    crypto.getRandomValues(saltArray);
    salt = Array.from(saltArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Combine password with salt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  
  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  
  return { hash, salt };
}

/**
 * Verify a password against a stored hash
 * @param {string} password - The plain text password to verify
 * @param {string} storedHash - The stored hash
 * @param {string} salt - The salt used when hashing
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, storedHash, salt) {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {{isValid: boolean, errors: string[]}} - Validation result
 */
export function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

