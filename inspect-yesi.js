const mammoth = require('mammoth');
const fs = require('fs');

(async () => {
  try {
    const docPath = '160.BCA-Yesi Mustofa Muli.docx';
    
    console.log('\n=== TESTING YESI DOCUMENT ===\n');
    console.log('File:', docPath);
    console.log('Exists:', fs.existsSync(docPath), '\n');
    
    // Extract with mammoth
    const result = await mammoth.extractRawText({ path: docPath });
    const text = result.value;
    
    console.log('=== RAW TEXT LENGTH ===');
    console.log('Chars:', text.length);
    console.log('\n=== RAW TEXT PREVIEW ===');
    console.log(text.substring(0, 500));
    console.log('\n...\n');
    
    // Show character codes for key characters
    console.log('=== CHARACTER ANALYSIS ===');
    const lines = text.split('\n').slice(0, 30);
    lines.forEach((line, i) => {
      if (line.length > 0) {
        console.log(`Line ${i}: ${JSON.stringify(line)}`);
      }
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
