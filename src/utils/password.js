// Password utilities for React Native
// Using expo-crypto for secure hashing

import * as Crypto from 'expo-crypto';

/**
 * Hash a password using SHA-256
 * Note: In production, use bcrypt or argon2 via a backend service
 * This is a simplified version for client-side demo purposes
 */
export async function hashPassword(password) {
  try {
    // Add a salt prefix for basic security
    const saltedPassword = `doto_salt_${password}_secure`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      saltedPassword
    );
    return hash;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, storedHash) {
  try {
    const inputHash = await hashPassword(password);
    return inputHash === storedHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
