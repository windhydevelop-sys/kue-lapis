const mongoose = require('mongoose');

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/website_aksesoris');
    
    const db = mongoose.connection.db;
    const productsCol = db.collection('products');
    
    // Find Yesi product
    const yesi = await productsCol.findOne({ nama: 'Yesi Mustofa Muli' });
    
    if (yesi) {
      console.log('\n=== YESI PRODUCT FOUND IN DB ===\n');
      console.log('ID:', yesi._id);
      console.log('Nama:', yesi.nama);
      console.log('NIK:', yesi.nik);
      console.log('No ATM:', yesi.noAtm);
      console.log('Valid Thru:', yesi.validThru);
      console.log('Kode Akses:', yesi.kodeAkses);
      console.log('Pin M-BCA:', yesi.pinMBca);
      console.log('User I-Banking:', yesi.ibUser);
      console.log('MyBCA User:', yesi.myBCAUser);
      console.log('Pass Email:', yesi.passEmail);
      console.log('Status:', yesi.status);
      console.log('Created:', yesi.createdAt);
    } else {
      console.log('\n❌ Yesi product NOT found in database');
      console.log('\nSearching for similar products...');
      const similar = await productsCol.find({ bank: 'BCA' }).limit(5).toArray();
      console.log('BCA products in DB:', similar.length);
      similar.forEach(p => {
        console.log('  -', p.nama, '(', p.noOrder, ')');
      });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
