const mammoth = require('mammoth');
const { parseProductData } = require('./backend/utils/pdfParser');
const fs = require('fs');

(async () => {
  try {
    const docPaths = [
      '79.BCA-Ricky Ardi Suwanto.docx',
      '160.BCA-Yesi Mustofa Muli.docx'
    ];
    
    for (const docPath of docPaths) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`DOCUMENT: ${docPath}`);
      console.log('='.repeat(50));
      
      if (!fs.existsSync(docPath)) {
        console.log('❌ File tidak ada');
        continue;
      }
      
      // Extract
      const result = await mammoth.extractRawText({ path: docPath });
      const text = result.value
        .replace(/[\u2013\u2014\u2212]/g, '-')
        .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
        .replace(/[""'']/g, "'");
      
      // Parse
      const extracted = parseProductData(text, 'BCA');
      
      if (extracted.length === 0) {
        console.log('❌ Tidak ada produk extracted');
        continue;
      }
      
      const product = extracted[0];
      
      console.log('\nFields di preview table:');
      console.log('- Bank:', product.bank);
      console.log('- Nama:', product.nama);
      console.log('- Valid Thru:', product.validThru);
      console.log('- Kode Akses:', product.kodeAkses);
      console.log('- mobilePassword:', product.mobilePassword);
      console.log('- mobilePin:', product.mobilePin);
      console.log('- ibUser:', product.ibUser);
      console.log('- ibPin:', product.ibPin);
      console.log('- myBCAUser:', product.myBCAUser);
      console.log('- myBCAPassword:', product.myBCAPassword);
      console.log('- myBCAPin:', product.myBCAPin);
      console.log('- passEmail:', product.passEmail);
      
      console.log('\nFields dengan value:');
      Object.entries(product).forEach(([key, value]) => {
        if (value && value !== '-' && value !== '' && typeof value === 'string') {
          console.log(`  ${key}: ${value}`);
        }
      });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
