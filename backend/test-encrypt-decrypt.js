const { encrypt, decrypt } = require('./utils/encryption.js');

const original = 'test-string-123';
const enc = encrypt(original);
console.log('Encrypted:', enc);
console.log('Decrypted:', decrypt(enc));
