const crypto = require('crypto-js');

const keysToTest = [
    'your_encryption_key_for_development',
    '8a429446bea8afba4f4ac8be384aca3d1651dfb59336e228bf7fe476661fc980'
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
