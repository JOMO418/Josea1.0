/**
 * Encryption Utilities for Sensitive Data
 * Uses AES-256-GCM encryption for conversation data at rest
 */

const crypto = require('crypto');

// CRITICAL: CONVERSATION_ENCRYPTION_KEY must be set in production
// This key encrypts all conversation data at rest in the database
if (process.env.NODE_ENV === 'production' && !process.env.CONVERSATION_ENCRYPTION_KEY) {
  console.error('❌ CRITICAL: CONVERSATION_ENCRYPTION_KEY is not set in production!');
  console.error('❌ Set this environment variable immediately to secure conversation data.');
  process.exit(1); // Prevent server start without encryption key
}

const ENCRYPTION_KEY = process.env.CONVERSATION_ENCRYPTION_KEY
  ? Buffer.from(process.env.CONVERSATION_ENCRYPTION_KEY, 'hex')
  : crypto.scryptSync(process.env.GEMINI_API_KEY || 'default-key', 'salt', 32);

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt text data
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text with IV and auth tag (format: iv:authTag:encrypted)
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag().toString('hex');

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    // Fall back to plaintext if encryption fails (better than losing data)
    return text;
  }
}

/**
 * Decrypt text data
 * @param {string} encryptedText - Encrypted text (format: iv:authTag:encrypted)
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText;
  }

  // Check if text is in encrypted format (has colons)
  if (!encryptedText.includes(':')) {
    // Not encrypted, return as-is (backward compatibility)
    return encryptedText;
  }

  try {
    // Parse encrypted format: iv:authTag:encrypted
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Invalid format, return as-is
      return encryptedText;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    // Return original if decryption fails (backward compatibility)
    return encryptedText;
  }
}

/**
 * Check if text appears to be encrypted
 * @param {string} text - Text to check
 * @returns {boolean} - True if appears encrypted
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;

  // Check for encryption format: iv:authTag:encrypted
  const parts = text.split(':');
  if (parts.length !== 3) return false;

  // Check if parts look like hex strings
  const hexPattern = /^[0-9a-f]+$/i;
  return parts.every(part => hexPattern.test(part));
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
};
