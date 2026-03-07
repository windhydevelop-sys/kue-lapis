const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

// Direct backend test - simulate what would be returned to frontend
const { processPDFFile } = require('./backend/utils/pdfParser');
const mammoth = require('mammoth');

(async () => {
  try {
    console.log('\n=== SIMULATING EXACT UPLOAD/PREVIEW FLOW ===\n');
    
    const docPath = '160.BCA-Yesi Mustofa Muli.docx';
    console.log('Step 1: User uploads:', docPath);
    
    // Backend receives file and processes
    console.log('Step 2: Backend processPDFFile called...');
    const result = await processPDFFile(docPath);
    
    console.log('Step 3: Backend validation result:');
    console.log('  success:', result.success);
    console.log('  validProducts:', result.validProducts?.length || 0);
    console.log('  errors:', result.errors?.length || 0);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n  ERROR DETAILS:');
      result.errors.forEach((err, i) => {
        console.log(`    Error ${i}:`, err.errors);
        console.log('    Data:', JSON.stringify(err.data).substring(0, 200));
      });
    }
    
    // This is what backend returns in response.data
    const backendResponse_data = {
      filename: path.basename(docPath),
      documentType: 'Document',
      textPreview: '...',
      extractedData: result.validProducts,  // <-- What frontend gets
      validation: {
        total: result.summary?.total,
        valid: result.summary?.valid,
        invalid: result.summary?.invalid,
        errors: result.errors
      }
    };
    
    console.log('\nStep 4: Backend response.data structure:');
    console.log('  extractedData:', backendResponse_data.extractedData?.length, 'products');
    
    // What frontend receives in handlePreview: setPreviewData(response.data.data)
    const previewData = backendResponse_data;
    
    console.log('\nStep 5: Frontend previewData.extractedData[0]:');
    if (previewData.extractedData && previewData.extractedData.length > 0) {
      const product = previewData.extractedData[0];
      
      console.log('  Keys received from backend:');
      const keysToCheck = [
        'codeAgen', 'noOrder', 'validThru', 'kodeAkses', 'pinMBca', 'ibUser', 'ibPin',
        'myBCAUser', 'myBCAPassword', 'myBCAPin', 'passEmail',
        'mobilePassword', 'mobilePin'
      ];
      
      keysToCheck.forEach(key => {
        const value = product[key];
        const status = value ? '✓' : '✗';
        console.log(`    ${status} ${key}: ${value || '(undefined)'}`);
      });
    }
    
    // Now simulate renderPreviewTable column matching
    console.log('\nStep 6: Frontend renderPreviewTable column matching:');
    
    const allColumns = [
      { id: 'codeAgen', label: 'Kode Orlap' },
      { id: 'validThru', label: 'Valid Kartu' },
      { id: 'kodeAkses', label: 'Kode Akses M-BCA', bank: 'bca' },
      { id: 'pinMBca', label: 'Pin M-BCA', bank: 'bca' },
      { id: 'ibUser', label: 'User I-Banking', bank: 'bca' },
      { id: 'ibPin', label: 'Pin I-Banking', bank: 'bca' },
      { id: 'myBCAUser', label: 'BCA-ID', bank: 'bca' },
      { id: 'myBCAPassword', label: 'Pass BCA-ID', bank: 'bca' },
      { id: 'myBCAPin', label: 'Pin Transaksi', bank: 'bca' },
      { id: 'passEmail', label: 'Password Email', bank: 'bca' },
    ];
    
    if (previewData.extractedData && previewData.extractedData.length > 0) {
      const product = previewData.extractedData[0];
      
      allColumns.forEach(col => {
        const value = product[col.id];
        const display = value || '-';
        const status = value ? '✓' : '✗';
        console.log(`  ${status} ${col.label} (id=${col.id}): ${display}`);
      });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
