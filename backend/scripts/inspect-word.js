const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../sample-word-format.docx');

async function inspectWord() {
    try {
        console.log('Inspecting:', filePath);

        // Extract raw text
        const textResult = await mammoth.extractRawText({ path: filePath });
        console.log('\n--- RAW TEXT CONTENT ---');
        console.log(textResult.value.substring(0, 2000)); // Show first 2000 chars

        // Extract HTML to see table structure
        const htmlResult = await mammoth.convertToHtml({ path: filePath });
        console.log('\n--- HTML STRUCTURE (Tables) ---');
        const html = htmlResult.value;

        // Simple regex to find table headers
        // Look for content inside <th> tags or first row <tr><td>
        // This is just for quick inspection

        if (html.includes('<table')) {
            console.log('Table detected!');
            // Log first part of HTML to see headers
            console.log(html.substring(0, 3000));
        } else {
            console.log('No HTML table detected.');
        }

    } catch (error) {
        console.error('Error inspecting file:', error);
    }
}

inspectWord();
