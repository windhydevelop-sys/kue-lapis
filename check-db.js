const Product = require('./backend/models/Product');
const path = require('path');
const dotenv = require('dotenv');

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const mongoose = require('mongoose');

(async () => {
  try {
    console.log('MongoDB URI:', process.env.MONGO_URI);
    console.log('Connecting to DB...');
    
    await mongoose.connect(process.env.MONGO_URI);
    
    const products = await Product.find({ bank: 'BCA' }).limit(5);
    console.log('\nTotal BCA Products in DB:', products.length);
    
    if (products.length > 0) {
      console.log('\n=== FIRST BCA PRODUCT ===\n');
      const p = products[0].toObject();
      
      // Show key fields
      console.log('ID:', p._id);
      console.log('Nama:', p.nama);
      console.log('Bank:', p.bank);
      console.log('NIK:', p.nik);
      console.log('No ATM:', p.noAtm);
      console.log('Valid Thru:', p.validThru);
      console.log('Kode Akses:', p.kodeAkses);
      console.log('Pin M-BCA:', p.pinMBca);
      console.log('MyBCA User:', p.myBCAUser);
      console.log('MyBCA Password:', p.myBCAPassword);
      console.log('User I-Banking:', p.ibUser);
      console.log('Pass Email:', p.passEmail);
      console.log('Status:', p.status);
      console.log('Created:', p.createdAt);
    } else {
      console.log('\n❌ No BCA products found in database!');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
