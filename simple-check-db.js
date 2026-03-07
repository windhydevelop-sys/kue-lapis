const mongoose = require('mongoose');

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/website_aksesoris');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('\nCollections:', collections.map(c => c.name));
    
    const productsCol = db.collection('products');
    const bcaCount = await productsCol.countDocuments({ bank: 'BCA' });
    console.log('\nBCA Products:', bcaCount);
    
    if (bcaCount > 0) {
      const first = await productsCol.findOne({ bank: 'BCA' });
      console.log('\nFirst BCA Product Fields:');
      console.log('- Nama:', first.nama);
      console.log('- NIK:', first.nik);
      console.log('- No ATM:', first.noAtm);
      console.log('- Valid Thru:', first.validThru);
      console.log('- Kode Akses:', first.kodeAkses);
      console.log('- Pin M-BCA:', first.pinMBca);
      console.log('- User I-Banking:', first.ibUser);
      console.log('- MyBCA User:', first.myBCAUser);
      console.log('- MyBCA Password:', first.myBCAPassword);
      console.log('- Pass Email:', first.passEmail);
      console.log('- Status:', first.status);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
