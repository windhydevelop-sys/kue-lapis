const mammoth = require('mammoth');

(async () => {
  const result = await mammoth.extractRawText({ path: '79.BCA-Ricky Ardi Suwanto.docx' });
  let text = result.value;

  // Apply same normalization as pdfParser
  text = text
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
    .replace(/[""'']/g, "'");

  console.log("\n=== DEBUGGING ibUser PATTERN ===\n");

  // Find "User I-Banking" in the text
  const idx = text.indexOf('User I-Banking');
  if (idx !== -1) {
    console.log("Context around 'User I-Banking':");
    const context = text.substring(idx - 20, idx + 200);
    console.log(JSON.stringify(context));
    console.log("\nWith character codes:");
    for (let i = idx; i < Math.min(idx + 100, text.length); i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      console.log(`  [${i}] '${char}' (code: ${code})`);
    }
  }

  console.log("\n=== TESTING DIFFERENT ibUser PATTERNS ===\n");

  const patterns = {
    ibUser_original: /(?:User\s*(?:I-Banking|I-Bank|IB|Internet\s*Banking)|I-Banking\s*User|Internet\s*Banking\s*User)[ \t:]*(?!\n)([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
    ibUser_fixed: /User\s*I-Banking[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]*)/i,
    ibUser_multiline: /User\s*I-Banking[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]*?)(?:\n|$)/i,
  };

  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = text.match(pattern);
    if (match) {
      console.log(`${key}:`);
      console.log(`  Full match: ${JSON.stringify(match[0])}`);
      console.log(`  Captured[1]: ${JSON.stringify(match[1])}`);
    } else {
      console.log(`${key}: NO MATCH`);
    }
  });
})();
