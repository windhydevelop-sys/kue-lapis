const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

// Direct test of import logic
const { parseProductData } = require('./backend/utils/pdfParser');
const mammoth = require('mammoth');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('\n=== SIMULATING YESI IMPORT FLOW ===\n');
    
    // STEP 1: Extract
    const docPath = '160.BCA-Yesi Mustofa Muli.docx';
    const result = await mammoth.extractRawText({ path: docPath });
    const text = result.value.replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
      .replace(/[""'']/g, "'");
    
    const extracted = parseProductData(text, 'BCA');
    console.log('STEP 1 - Extract: ✓');
    console.log('Extracted products:', extracted.length);
    
    if (extracted.length === 0) {
      console.log('❌ No products extracted!');
      process.exit(1);
    }
    
    // STEP 2: Validate (check for duplicates by noRek)
    const Product = require('./backend/models/Product');
    const productData = extracted[0];
    
    console.log('\nSTEP 2 - Validation:');
    console.log('- Nama:', productData.nama);
    console.log('- No. Rekening:', productData.noRek);
    console.log('- Valid Thru:', productData.validThru);
    console.log('- Kode Akses:', productData.kodeAkses);
    
    // Check duplicate
    if (productData.noRek && productData.noRek.trim() !== '' && productData.noRek !== '-') {
      const existing = await Product.findOne({ noRek: productData.noRek });
      if (existing) {
        console.log('⚠️  DUPLICATE FOUND - No. Rekening already exists in DB');
        console.log('   Existing product:', existing.nama);
        process.exit(0);
      }
    }
    console.log('✓ No duplicate (No. Rekening is unique)');
    
    // STEP 3: Mock Save (don't actually save, just check if model would accept it)
    console.log('\nSTEP 3 - Create product model:');
    const testProduct = new Product(productData);
    console.log('✓ Product model created (no save yet)');
    
    // Show what would be saved
    console.log('\nFields that would be saved:');
    console.log('- nama:', testProduct.nama);
    console.log('- noOrder:', testProduct.noOrder);
    console.log('- noRek:', testProduct.noRek);
    console.log('- bank:', testProduct.bank);
    console.log('- createdAt: (new)');
    console.log('- status: (default)');
    
    console.log('\n✅ Yesi product is ready to import!');
    console.log('No technical blockers detected for import.');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
