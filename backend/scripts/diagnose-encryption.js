/**
 * Utility to diagnose and fix encryption issues with existing products
 * Run with: node scripts/fix-encryption.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const path = require('path');
const Product = require('../models/Product');
const { encrypt, decrypt } = require('../utils/encryption');

const connectDB = require('../config/db');

async function diagnoseEncryption() {
  try {
    console.log('[DIAGNOSE] Starting encryption diagnosis...\n');
    
    await connectDB();
    
    // Get a sample of products
    const products = await Product.find().limit(5);
    
    if (products.length === 0) {
      console.log('No products found in database');
      process.exit(0);
    }
    
    console.log(`[INFO] Checking ${products.length} sample products:\n`);
    
    const fieldsToCheck = ['mobileUser', 'mobilePassword', 'mobilePin', 'kodeAkses', 'myBCAUser', 'myBCAPassword'];
    
    products.forEach((product, idx) => {
      console.log(`Product ${idx + 1}: ${product.noOrder || 'N/A'}`);
      
      fieldsToCheck.forEach(field => {
        const value = product[field];
        if (value) {
          const isEncrypted = String(value).startsWith('U2FsdGVkX1');
          
          if (isEncrypted) {
            try {
              const decrypted = decrypt(value);
              const stillEncrypted = String(decrypted).startsWith('U2FsdGVkX1');
              console.log(`  ${field}: encrypted=${isEncrypted}, decryptable=${!stillEncrypted}`);
              if (stillEncrypted) {
                console.log(`    ⚠️  Could not decrypt - may have been encrypted with different key`);
              }
            } catch (e) {
              console.log(`  ${field}: ERROR during decryption`);
            }
          } else {
            console.log(`  ${field}: NOT encrypted (plain text)`);
          }
        }
      });
      console.log();
    });
    
    console.log('[INFO] Diagnosis complete');
    console.log('\nRECOMMENDATIONS:');
    console.log('1. Check that ENCRYPTION_KEY in .env matches the key used to encrypt existing data');
    console.log('2. If key is correct but data still encrypted, the data may be corrupted');
    console.log('3. New products will use the current ENCRYPTION_KEY automatically');
    
    process.exit(0);
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

diagnoseEncryption();
