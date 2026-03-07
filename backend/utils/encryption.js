require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const crypto = require('crypto-js');

// Encryption key from environment - read AFTER dotenv initialization
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_not_secure_change_this';

// Log key initialization
if (process.env.ENCRYPTION_KEY) {
  console.log('[ENCRYPTION] ENCRYPTION_KEY is set from environment');
} else {
  console.warn('[ENCRYPTION] WARNING: Using default encryption key. Set ENCRYPTION_KEY env var for production!');
}

// Encrypt sensitive data
const encrypt = (text) => {
  try {
    if (!text) return text;
    const encrypted = crypto.AES.encrypt(String(text), ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('[ENCRYPT ERROR]:', error.message);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt sensitive data
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText;
  }

  let currentText = encryptedText;
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (currentText.startsWith('U2FsdGVkX1') && iterations < MAX_ITERATIONS) {
    try {
      const bytes = crypto.AES.decrypt(currentText, ENCRYPTION_KEY);
      const decrypted = bytes.toString(crypto.enc.Utf8);

      // If the result is an empty string but the input was not, 
      // it's likely not a valid ciphertext or wrong key
      if (!decrypted && currentText) {
        console.warn('[DECRYPT WARN] Decryption returned empty string. Possible wrong encryption key.');
        break;
      }

      currentText = decrypted;
      iterations++;
    } catch (error) {
      // If decryption fails, break and return what we have so far
      console.error('[DECRYPT ERROR]:', error.message, '- Returning current text as-is');
      break;
    }
  }

  return currentText;
};

// Hash sensitive data (one-way encryption for PINs/passwords)
const hashSensitive = (text) => {
  try {
    return crypto.SHA256(text).toString();
  } catch (error) {
    console.error('Hashing error:', error);
    throw new Error('Failed to hash data');
  }
};

module.exports = {
  encrypt,
  decrypt,
  hashSensitive
};