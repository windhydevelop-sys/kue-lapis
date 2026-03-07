// Test extraction against actual Word document data
const fs = require('fs');
const mammoth = require('mammoth');

// Raw text extracted from Word document
const docxPath = '79.BCA-Ricky Ardi Suwanto.docx';

(async () => {
  try {
    const result = await mammoth.extractRawText({ path: docxPath });
    const text = result.value;

    console.log("=".repeat(80));
    console.log("EXTRACTED TEXT LENGTH:", text.length);
    console.log("=".repeat(80));

    // Apply pdfParser normalization
    let normalized = text
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
      .replace(/[""'']/g, "'");

    console.log("\nNORMALIZED TEXT:\n");
    console.log(normalized);
    console.log("\n" + "=".repeat(80));

    // Split into blocks
    const productBlocks = normalized.split(/(?=No\s*\.?\s*ORDER)/i).filter(block => block && block.length > 20);
    console.log("\nBLOCK COUNT:", productBlocks.length);
    console.log("BLOCK LENGTH:", productBlocks[0]?.length);

    if (productBlocks.length === 0) {
      console.log("\n❌ NO BLOCKS FOUND - Regex split might be broken!");
      console.log("Testing split regex /(?=No\\s*\\.?\\s*ORDER)/i:");
      if (/No\s*\.?\s*ORDER/i.test(normalized)) {
        console.log("✓ Pattern DOES exist in text");
      } else {
        console.log("✗ Pattern NOT found in text");
      }
      return;
    }

    // Test key patterns
    const blockText = productBlocks[0];
    const testPatterns = {
      noOrder: /(?:No\s*\.?\s*ORDER|No\s*Order)[ \t:]*[(\[]?\s*([^\]\)\n]+?)(?:\s+NIK|\s+Nama|\n|$|[)\]])/i,
      nik: /NIK[ \t:]*([0-9\-\s]{16,25})/i,
      nama: /Nama[ \t:]*([A-Za-z0-9\s\.\:\'\"\(\)\-\&\/]+?)(?:\s+Ibu|\s+Tempat|\s+No\.|\n|$)/i,
      noRek: /(?:No.*?Rek(?:ening)?|No\.?Rek)[ \t:]*([0-9\s\-]{8,25})/i,
      kodeAkses: /(?:Kode\s*Akses|Kode\s*Akses\s*M-BCA|Access\s*Code|Kode\s*M-BCA)[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      pinMBca: /(?:Pin\s*(?:M-BCA|M\s*BCA|Mobile\s*BCA|Mobile))[ \t:]*([0-9]{4,10})/i,
      myBCAUser: /(?:BCA\s*ID|BCA-ID|User\s*myBCA)[\s:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      myBCAPassword: /(?:Pass\s*BCA-ID|Pass\s*BCA\s*ID|Password\s*myBCA)[\s:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      myBCAPin: /(?:Pin\s*Transaksi|Pin\s*myBCA|Pin\s*BCA\s*ID|Pin\s*BCA-ID)[\s:]*([0-9]{4,10})/i,
      ibUser: /(?:User\s*(?:I-Banking|I-Bank|IB|Internet\s*Banking)|I-Banking\s*User|Internet\s*Banking\s*User)[ \t:]*(?!\n)([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      ibPin: /(?:Pin\s*(?:I-Banking|I-Bank|IB|Internet\s*Banking)?)[ \t:]*(?!\n)([0-9]{4,10})/i,
      email: /Email[ \t:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      pinAtm: /(?:(?:U-)?PIN(?:\s+ATM)?|PIN(?:\s+Kartu)?|PIN\s+Transaksi\s+ATM)[ \t:]*([0-9\s\-]{4,10})/i,
    };

    console.log("\nTESTING PATTERNS ON BLOCK TEXT:\n");
    Object.entries(testPatterns).forEach(([key, pattern]) => {
      const match = blockText.match(pattern);
      if (match && match[1]) {
        console.log(`✓ ${key.padEnd(20)} => "${match[1].trim()}"`);
      } else {
        console.log(`✗ ${key.padEnd(20)} => NO MATCH`);
      }
    });

  } catch (error) {
    console.error("Error:", error.message);
  }
})();
