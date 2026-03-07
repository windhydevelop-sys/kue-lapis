const crypto = require('crypto-js');

const keysToTest = [
    'default_key_not_secure_change_this',
    'your_32_character_encryption_key_here_12345678901234567890123456789012',
    'website-aksesoris-encryption-key-please-change-for-production',
    'super_secret_encryption_key_12345',
    'secure_key_12345'
];

const encryptedList = [
    'U2FsdGVkX18zEHUP6AMzM3TZ6uN/jkP/xydTwwfqmv4=',
    'U2FsdGVkX192LdE+4yBdE7CmgaCc1xNKGzyhfLGFw6s=',
    'U2FsdGVkX19MPUVc7fKKSabIE57ci1DM9bdU8HYKf9I='
];

for (const key of keysToTest) {
    console.log('Testing key:', key);
    for (const encrypted of encryptedList) {
        try {
            const bytes = crypto.AES.decrypt(encrypted, key);
            const decrypted = bytes.toString(crypto.enc.Utf8);
            if (decrypted) {
                console.log(`  SUCCESS for ${encrypted} -> ${decrypted}`);
            }
        } catch (e) {
            // ignore
        }
    }
}
