/**
 * Migration Script: Add Debit/Credit fields to existing Cashflow entries
 * 
 * Usage: node scripts/migrate-cashflow-debit-credit.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
const Cashflow = require('../models/Cashflow');

async function migrateCashflowEntries() {
  try {
    console.log('🔄 Starting Cashflow migration...');
    console.log('📡 Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/website_aksesoris');
    console.log('✅ Connected to MongoDB');

    console.log('📊 Finding existing cashflow entries...');
    const entries = await Cashflow.find({});
    console.log(`📋 Found ${entries.length} cashflow entries`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const entry of entries) {
      try {
        let needsUpdate = false;
        const updateData = { lastModifiedBy: entry.createdBy };

        // Set debit/credit based on type
        if (entry.type === 'income') {
          if (entry.debit === 0 && entry.credit === 0) {
            updateData.debit = entry.amount;
            updateData.credit = 0;
            needsUpdate = true;
          }
          if (!entry.accountCode || entry.accountCode === '1101') {
            updateData.accountCode = '1101'; // Cash
            updateData.accountName = 'Cash';
            needsUpdate = true;
          }
        } else if (entry.type === 'expense') {
          if (entry.debit === 0 && entry.credit === 0) {
            updateData.debit = 0;
            updateData.credit = entry.amount;
            needsUpdate = true;
          }
          if (!entry.accountCode || entry.accountCode === '5200') {
            updateData.accountCode = '5200'; // General Expense
            updateData.accountName = 'Expense';
            needsUpdate = true;
          }
        }

        // Add journal description if missing
        if (!entry.journalDescription && entry.description) {
          updateData.journalDescription = entry.description;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await Cashflow.findByIdAndUpdate(entry._id, updateData);
          updatedCount++;
          console.log(`✅ Updated entry ${entry._id}: ${entry.type} - Rp ${entry.amount.toLocaleString('id-ID')}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating entry ${entry._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} entries`);
    console.log(`❌ Errors: ${errorCount} entries`);
    console.log(`📋 Total processed: ${entries.length} entries`);

    if (updatedCount > 0) {
      console.log('\n🎯 Migration completed successfully!');
      console.log('💡 The enhanced journal system is now active.');
    } else {
      console.log('\nℹ️  No updates needed - all entries already have enhanced fields.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

if (require.main === module) {
  migrateCashflowEntries().then(() => {
    console.log('🏁 Migration script completed.');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = migrateCashflowEntries;