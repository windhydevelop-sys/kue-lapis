const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const Product = require('./backend/models/Product');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✓ Connected to MongoDB\n');
    
    // Check schema requirements
    console.log('=== PRODUCT SCHEMA ANALYSIS ===\n');
    
    const schema = Product.schema;
    const requiredFields = [];
    
    Object.keys(schema.obj).forEach(field => {
      const fieldDef = schema.obj[field];
      if (fieldDef.required === true) {
        requiredFields.push(field);
      }
    });
    
    console.log('Required fields:', requiredFields.length > 0 ? requiredFields.join(', ') : 'NONE');
    console.log('\n=== TESTING YESI DATA ===\n');
    
    // Simulate Yesi extraction data
    const yesiData = {
      nik: "3173-0407-0190-0009",
      nama: "Yesi Mustofa Muli",
      namaIbuKandung: "Soleha",
      tempatTanggalLahir: "Jakarta, 07-01-1990",
      noRek: "5370-571-416",
      noAtm: "6019-0095-1534-9949",
      validThru: "02/30",
      noHp: "0859-2751-1380",
      bank: "BCA",
      grade: "B",
      kcp: "Season City",
      noOrder: "FYONGSGO112",
      codeAgen: "GGE",
      customer: "-",
      pinAtm: "145145",
      kodeAkses: "dwiy14",
      pinMBca: "145145",
      ibUser: "YESIMUSTO790",
      ibPin: "145145",
      myBCAUser: "YESIMUSTHOFA47",
      myBCAPassword: "Dwiyans145",
      myBCAPin: "145145",
      passEmail: "@Dwiyans145",
      status: 'pending'
    };
    
    console.log('Creating product model...');
    const product = new Product(yesiData);
    
    console.log('Validating...');
    const err = product.validateSync();
    
    if (err) {
      console.log('❌ Validation errors:');
      Object.keys(err.errors).forEach(field => {
        console.log(`  - ${field}: ${err.errors[field].message}`);
      });
    } else {
      console.log('✓ Validation passed - no errors');
      console.log('\nData that would be saved:');
      console.log('- Nama:', product.nama);
      console.log('- No. Rekening:', product.noRek);
      console.log('- Valid Thru:', product.validThru);
      console.log('- Kode Akses:', product.kodeAkses);
      console.log('- User I-Banking:', product.ibUser);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
