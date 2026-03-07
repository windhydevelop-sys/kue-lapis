/**
 * Utility to re-encrypt products with correct encryption key
 * This should be run if products were encrypted with wrong key
 * Run with: node scripts/re-encrypt-products.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const path = require('path');

const connectDB = require('../config/db');

async function reEncryptProducts() {
  try {
    console.log('[RE-ENCRYPT] Starting product re-encryption...\n');
    console.log(`Using ENCRYPTION_KEY from environment: ${process.env.ENCRYPTION_KEY.substring(0, 20)}...`);
    
    await connectDB();
    
    // Get Product model fresh (with updated encryption key)
    const Product = require('../models/Product');
    
    const fieldsToEncrypt = [
      'mobileUser', 'mobilePassword', 'mobilePin', 
      'kodeAkses', 'myBCAUser', 'myBCAPassword', 'myBCAPin',
      'pinMBca', 'ibUser', 'ibPassword', 'ibPin'
    ];
    
    // Get all products
    const products = await Product.find().lean();
    console.log(`[INFO] Found ${products.length} products to process\n`);
    
    let updated = 0;
    
    for (const product of products) {
      let hasChanges = false;
      
      for (const field of fieldsToEncrypt) {
        const value = product[field];
        // If field has value but is not encrypted, we need to encrypt it
        // (This shouldn't happen in normal operation)
        if (value && !String(value).startsWith('U2FsdGVkX1')) {
          // Don't actually modify - just report
          console.log(`${product.noOrder}: Field ${field} is not encrypted`);
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        updated++;
      }
    }
    
    console.log(`\n[INFO] Re-encryption analysis complete`);
    console.log(`Found ${updated} products with potential issues`);
    console.log('\nNOTE: New products created after this fix will use correct encryption automatically');
    
    process.exit(0);
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

reEncryptProducts();
