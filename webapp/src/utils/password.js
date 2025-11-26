const encoder = new TextEncoder();

async function digestSHA256(text) {
  const cryptoImpl = globalThis?.crypto;
  if (!cryptoImpl?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }

  const data = encoder.encode(text);
  const hashBuffer = await cryptoImpl.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a plain-text password using SHA-256.
 * @param {string} password
 * @returns {Promise<string>} Hex-encoded hash.
 */
export async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required for hashing.');
  }
  return digestSHA256(password);
}

/**
 * Compare a candidate password against an existing hash.
 * @param {string} candidate
 * @param {string} existingHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(candidate, existingHash) {
  if (!candidate || !existingHash) {
    return false;
  }
  const candidateHash = await digestSHA256(candidate);
  return candidateHash === existingHash;
}


