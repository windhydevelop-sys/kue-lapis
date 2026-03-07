/**
 * clear-corrupted-fields.js
 *
 * This script scans all Products in the database for encrypted fields
 * that CANNOT be decrypted with the current ENCRYPTION_KEY.
 * Those fields are set to null (empty) so the user can re-enter them via the UI.
 *
 * Usage: node scripts/clear-corrupted-fields.js
 *        node scripts/clear-corrupted-fields.js --dry-run   (preview only, no changes)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY is not set in .env!');
    process.exit(1);
}

console.log(`🔑 Using ENCRYPTION_KEY: "${ENCRYPTION_KEY.substring(0, 8)}..."`);
console.log(DRY_RUN ? '🔍 DRY RUN - no changes will be saved.' : '⚠️  LIVE RUN - changes WILL be saved to database.');
console.log('');

// Fields that should be encrypted
const encryptedFields = [
    'pinAtm', 'pinWondr', 'passWondr', 'passEmail',
    'myBCAUser', 'myBCAPassword', 'myBCAPin',
    'brimoUser', 'brimoPassword', 'briMerchantUser', 'briMerchantPassword',
    'kodeAkses', 'pinMBca',
    'mobileUser', 'mobilePassword', 'mobilePin',
    'ibUser', 'ibPassword', 'ibPin',
    'merchantUser', 'merchantPassword',
    'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'
];

/**
 * Try to decrypt a value. Returns null if it looks encrypted but fails decryption.
 * Returns the value unchanged if it doesn't look encrypted.
 */
function tryDecrypt(value) {
    if (!value || typeof value !== 'string') return value;
    if (!value.startsWith('U2FsdGVkX1')) return value; // Not encrypted, OK

    try {
        const bytes = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null; // Failed to decrypt → corrupted
        return decrypted;
    } catch (e) {
        return null; // Error → corrupted
    }
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Build a query: find all products that have ANY encrypted-looking field
    const orConditions = encryptedFields.map(f => ({
        [f]: { $regex: '^U2FsdGVkX1', $options: '' }
    }));

    const products = await mongoose.connection.db
        .collection('products')
        .find({ $or: orConditions })
        .toArray();

    console.log(`Found ${products.length} product(s) with potentially encrypted fields.\n`);

    let totalFieldsCleared = 0;
    let totalProductsAffected = 0;

    for (const product of products) {
        const updates = {};
        const corruptedFieldNames = [];

        for (const field of encryptedFields) {
            const raw = product[field];
            if (!raw || !String(raw).startsWith('U2FsdGVkX1')) continue;

            const decrypted = tryDecrypt(raw);
            if (decrypted === null) {
                // Corrupted — schedule for clearing
                updates[field] = null;
                corruptedFieldNames.push(field);
            }
        }

        if (corruptedFieldNames.length === 0) continue;

        const name = product.nama || product.noOrder || String(product._id);
        const bank = product.bank || '-';

        console.log(`📋 [${bank}] ${name}`);
        console.log(`   Corrupted fields: ${corruptedFieldNames.join(', ')}`);

        if (!DRY_RUN) {
            await mongoose.connection.db
                .collection('products')
                .updateOne({ _id: product._id }, { $unset: updates });
            console.log(`   ✅ Cleared ${corruptedFieldNames.length} field(s)`);
        } else {
            console.log(`   🔍 [DRY RUN] Would clear ${corruptedFieldNames.length} field(s)`);
        }

        totalFieldsCleared += corruptedFieldNames.length;
        totalProductsAffected++;
        console.log('');
    }

    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   Products affected : ${totalProductsAffected}`);
    console.log(`   Fields cleared    : ${totalFieldsCleared}`);
    if (DRY_RUN) {
        console.log('\n💡 Run without --dry-run to apply changes:');
        console.log('   node scripts/clear-corrupted-fields.js');
    } else {
        console.log('\n✅ Done! Corrupted fields have been cleared.');
        console.log('   Users can now re-enter data via the product edit UI.');
    }

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
