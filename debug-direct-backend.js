const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const { processPDFFile } = require('./backend/utils/pdfParser');

(async () => {
  try {
    console.log('=== Direct Backend Test ===\n');
    
    const docPath = '160.BCA-Yesi Mustofa Muli.docx';
    const result = await processPDFFile(docPath);
    
    console.log('Result:', result.summary);
    
    if (result.validProducts && result.validProducts.length > 0) {
      const product = result.validProducts[0];
      console.log('\nProduct keys with values:');
      Object.keys(product).forEach(key => {
        const val = product[key];
        if (val && val !== 'KOSONG' && val !== '-' && val !== '') {
          console.log(`  ${key}: ${val}`);
        }
      });
      
      console.log('\nSpecifically searching for validThru:');
      console.log('  product.validThru:', product.validThru);
      console.log('  product["validThru"]:', product['validThru']);
      console.log('  product["Valid Kartu"]:', product['Valid Kartu']);
      
      // Check all keys
      const allKeys = Object.keys(product);
      console.log('\n  All keys:', allKeys.join(', '));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
