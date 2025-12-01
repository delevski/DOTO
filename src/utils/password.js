// Password utilities for React Native
// Using a simple hash for demo - in production use bcrypt via a backend

// Simple hash function (for demo purposes)
// In production, you should use proper bcrypt hashing via your backend
export async function hashPassword(password) {
  // Simple hash using Web Crypto API compatible approach
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_doto_salt_2024');
  
  // Create a simple hash (not cryptographically secure for production)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `hash_${Math.abs(hash).toString(16)}`;
}

export async function verifyPassword(password, storedHash) {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}

// Generate a random verification code
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

