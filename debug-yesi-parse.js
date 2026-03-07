const { parseListFormat } = require('./backend/utils/documentParser');
const mammoth = require('mammoth');

(async () => {
  try {
    const result = await mammoth.extractRawText({ path: '160.BCA-Yesi Mustofa Muli.docx' });
    const text = result.value;
    console.log('===  RAW TEXT FROM DOCUMENT ===');
    console.log(text);
    
    console.log('\n === PARSING WITH parseListFormat ===');
    const rows = parseListFormat(text);
    console.log('Parsed rows:', rows.length);
    if (rows.length > 0) {
      console.log('\nHeaders:');
      rows[0].forEach((h, i) => console.log('  [' + i + '] ' + h));
      
      console.log('\nData (non-empty fields):');
      rows[1].forEach((v, i) => {
        if (v && v !== '') {
          console.log('  [' + i + '] ' + rows[0][i] + ': ' + v);
        }
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
