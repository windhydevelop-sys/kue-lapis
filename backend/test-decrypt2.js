const crypto = require('crypto-js');
const ENCRYPTION_KEY = 'default_key_not_secure_change_this';
const encrypted = 'U2FsdGVkX19MPUVc7fKKSabIE57ci1DM9bdU8HYKf9I=';

console.log("Input:", encrypted);
try {
  const bytes = crypto.AES.decrypt(encrypted, ENCRYPTION_KEY);
  console.log("Bytes length:", bytes.sigBytes);
  const decrypted = bytes.toString(crypto.enc.Utf8);
  console.log("Decrypted string length:", decrypted.length);
  console.log("Decrypted value:", decrypted);
} catch (e) {
  console.error("Error:", e.message);
}
