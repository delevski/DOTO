// Password utilities for React Native
// Must match the web app's password.js implementation for compatibility

import * as Crypto from 'expo-crypto';

/**
 * Convert ArrayBuffer to hex string (matching web app implementation)
 */
function arrayBufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a password using SHA-256
 * IMPORTANT: This must match the web app's implementation exactly
 * Web app does: TextEncoder().encode(password) -> crypto.subtle.digest('SHA-256', data) -> hex
 */
export async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required for hashing.');
  }
  try {
    // Method 1: Use expo-crypto's digestStringAsync
    // This should produce the same result as Web Crypto API
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    console.log('[Password] Hashed password (first 20 chars):', hash.substring(0, 20));
    console.log('[Password] Hash length:', hash.length);
    
    // Return lowercase hex to match web app
    return hash.toLowerCase();
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 * Compares SHA-256 hash of candidate password against stored hash
 */
export async function verifyPassword(candidate, existingHash) {
  if (!candidate || !existingHash) {
    console.log('[Password] Missing candidate or existingHash');
    return false;
  }
  try {
    const candidateHash = await hashPassword(candidate);
    // Normalize both to lowercase for comparison
    const normalizedCandidate = candidateHash.toLowerCase();
    const normalizedStored = existingHash.toLowerCase();
    
    // Debug logging to compare hashes
    console.log('[Password] Candidate hash:', normalizedCandidate);
    console.log('[Password] Stored hash:', normalizedStored);
    console.log('[Password] Hash length - candidate:', normalizedCandidate?.length, 'stored:', normalizedStored?.length);
    console.log('[Password] Match:', normalizedCandidate === normalizedStored);
    return normalizedCandidate === normalizedStored;
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
