const { parseListFormat } = require('./backend/utils/documentParser');
const mammoth = require('mammoth');

(async () => {
  try {
    const result = await mammoth.extractRawText({ path: '160.BCA-Yesi Mustofa Muli.docx' });
    const text = result.value;
    
    // Parse list format
    const rows = parseListFormat(text);
    console.log('=== PARSELISTFORMAT OUTPUT ===');
    console.log('Rows:', rows.length);
    
    // Find validThru / Valid Kartu
    const validIdx = rows[0].indexOf('Valid Kartu');
    console.log('\nValid Kartu index:', validIdx);
    console.log('Header:', rows[0][validIdx]);
    console.log('Data value:', rows[1][validIdx]);
    
    // Now test parseTableData
    console.log('\n=== PARSETABLEDATA ===');
    
    // Import internal function - need to test locally
    const normalizeHeaderCell = (cell) => {
      return String(cell)
        .trim()
        .toLowerCase()
        .replace(/[-\/().\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    console.log('Normalized "Valid Kartu":', normalizeHeaderCell('Valid Kartu'));
    
    // Check if it matches the pattern
    const pattern = /valid\s+kartu|^valid\s+kartu$/i;
    console.log('Matches pattern /valid\\s+kartu/i:', pattern.test(normalizeHeaderCell('Valid Kartu')));
    
    const pattern2 = /^valid\s+kartu$|^valid\s+thru$/i;
    console.log('Matches pattern standalone:', pattern2.test(normalizeHeaderCell('Valid Kartu')));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
