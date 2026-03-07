const { parseListFormat } = require('./backend/utils/documentParser');
const mammoth = require('mammoth');

// Replicate parseTableData logic
const normalizeHeaderCell = (cell) => {
  return String(cell)
    .trim()
    .toLowerCase()
    .replace(/[-\/().\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchHeaderToField = (headerCell) => {
  const normalized = normalizeHeaderCell(headerCell);
  const patterns = [
    { regex: /valid\s+thru|valid\s+kartu|valid\s+sd|valid\s+card|expire|masa\s+aktif|berlaku/i, field: 'validThru' },
    { regex: /^valid\s+kartu$|^valid\s+thru$/i, field: 'validThru' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(normalized)) {
      return pattern.field;
    }
  }
  return undefined;
};

(async () => {
  try {
    const result = await mammoth.extractRawText({ path: '160.BCA-Yesi Mustofa Muli.docx' });
    const text = result.value;
    
    const rows = parseListFormat(text);
    console.log('=== MANUAL TABLEDDATA SIMULATION ===\n');
    
    const headerRow = rows[0];
    const dataRow = rows[1];
    
    console.log('Header row length:', headerRow.length);
    console.log('Data row length:', dataRow.length);
    
    // Build headerMap
    const headerMap = {};
    headerRow.forEach((cell, idx) => {
      const field = matchHeaderToField(cell);
      console.log(`[${idx}] "${cell}" -> normalized: "${normalizeHeaderCell(cell)}" -> field: ${field}`);
      if (field !== undefined && field !== null) {
        headerMap[idx] = field;
      }
    });
    
    console.log('\nHeaderMap:', headerMap);
    console.log('\nNow building product....');
    
    const product = {};
    dataRow.forEach((cell, idx) => {
      const field = headerMap[idx];
      if (field) {
        product[field] = String(cell).trim();
        if (field === 'validThru') {
          console.log(`  Found validThru at index ${idx}: "${cell.trim()}"`);
        }
      }
    });
    
    console.log('\nProduct.validThru:', product.validThru);
    console.log('Product.validThru === "":', product.validThru === '');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
