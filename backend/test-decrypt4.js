const { decrypt } = require('./utils/encryption.js');

const good = 'U2FsdGVkX1/8MozKgrh73QWGUE22ysboG9HyDRajjdw=';
const decrypted = decrypt(good);

console.log("Good decrypted:", decrypted);

const DoubleEncrypted = 'U2FsdGVkX1/BsQ4C+gzT+LugAR6x8kxyF+AZmuVejWM=';
// Wait, the user provided this one! Let's see if it decrypts.
const d2 = decrypt(DoubleEncrypted);
console.log("DoubleEncrypted decrypted:", d2);
