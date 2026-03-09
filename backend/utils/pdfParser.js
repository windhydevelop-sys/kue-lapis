const fs = require('fs');
const path = require('path');
const { logger, securityLog } = require('./audit');
const { extractImagesFromHtml, uploadImageToCloudinary, extractImagesFromPDF } = require('./imageExtractor');
const { parseDocument } = require('./documentParser');
const { uploadBufferToCloudinary } = require('./cloudinary');

let PDFParse = null;
try {
  const pdfModule = require('pdf-parse');
  // Check if it's the Mehmet Kozan version (class-based)
  if (pdfModule.PDFParse) {
    PDFParse = pdfModule.PDFParse;
  } else if (typeof pdfModule === 'function') {
    // Fallback for standard pdf-parse
    PDFParse = pdfModule;
  }
} catch (error) {
  logger.warn('pdf-parse library error or not available');
}

// Extract PDF text using the available library
const extractTextFromPDF = async (pdfBuffer) => {
  try {
    if (!PDFParse) return 'PDF parser not available';

    // If it's a class (Mehmet Kozan version)
    if (typeof PDFParse === 'function' && PDFParse.prototype && PDFParse.prototype.load) {
      const pdf = new PDFParse(new Uint8Array(pdfBuffer));
      await pdf.load();
      const result = await pdf.getText();
      return (result && typeof result === 'object' ? result.text : result) || '';
    }

    // If it's the standard function parser
    if (typeof PDFParse === 'function') {
      const data = await PDFParse(pdfBuffer);
      return data.text || '';
    }

    return 'Unsupported PDF parser format';
  } catch (error) {
    logger.error('PDF text extraction failed:', {
      error: error.message,
      stack: error.stack,
      bufferSize: pdfBuffer ? pdfBuffer.length : 0
    });
    return 'PDF processing error: ' + error.message;
  }
};

// Extract tables directly if using the advanced parser
const extractTablesFromPDF = async (pdfBuffer) => {
  try {
    if (typeof PDFParse === 'function' && PDFParse.prototype && PDFParse.prototype.getPageTables) {
      const pdf = new PDFParse(new Uint8Array(pdfBuffer));
      await pdf.load();

      const allTables = [];
      // Try to extract from first 5 pages
      const pagesToTry = Math.min(pdf.pagesCount || 1, 5);
      for (let i = 0; i < pagesToTry; i++) {
        try {
          const pageTables = await pdf.getPageTables(i);
          if (pageTables && pageTables.length > 0) {
            pageTables.forEach(table => {
              if (table.rows && table.rows.length > 1) {
                // Convert table rows to 2D array of strings
                allTables.push(table.rows.map(row =>
                  row.map(cell => (cell && typeof cell === 'object') ? (cell.text || '') : String(cell))
                ));
              }
            });
          }
        } catch (e) { /* skip page */ }
      }
      return allTables.length > 0 ? allTables[0] : null; // Return first found table
    }
  } catch (error) {
    logger.warn('Advanced PDF table extraction failed, falling back to text parsing', { error: error.message });
  }
  return null;
};

const parseProductData = (rawText) => {
  const products = [];

  // Normalization
  let text = rawText
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
    .replace(/[“”‘’]/g, "'");

  const productBlocks = text.split(/(?=No\s*\.?\s*ORDER)/i).filter(block => block && block.length > 20);

  logger.info('Parsing text data', { totalChars: text.length, detectedBlocks: productBlocks.length });

  productBlocks.forEach((blockText, index) => {
    const patterns = {
      // 1. BRI BRIMO - Explicit patterns first
      brimoUser: /(?:User|ID|Account|Login|Username)\s*(?:Brimo|BRIMO|BRI\s*Mobile)[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      brimoPassword: /(?:Pass(?:word)?|Kata\s*Sandi|Password)\s*(?:Brimo|BRIMO|BRI\s*Mobile)[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      // brimoPin is mapped to mobilePin below for consistency

      // 2. BRI MERCHANT QRIS
      briMerchantUser: /(?:User|ID|Username|Account)\s*(?:BRI\s*)?(?:Merchant|Qris|QRIS)[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      briMerchantPassword: /(?:Pass(?:word)?|Kata\s*Sandi|Password)\s*(?:BRI\s*)?(?:Merchant|Qris|QRIS)[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,

      // 3. BCA Specific Fields
      kodeAkses: /Kode\s+Akses[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      pinMBca: /Pin\s+M-?BCA[ \t:]*([0-9]{4,10})/i,
      pinKeyBCA: /(?:Pin\s+KeyBCA|Pin\s+BCAkey|Pin\s+soft|KeyBCA\s+pin|KeyBCA)[ \t:]*([0-9]{4,10}|[A-Za-z0-9]{4,10})/i,
      myBCAUser: /BCA-?ID[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      myBCAPassword: /Pass\s+BCA-?ID[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      myBCAPin: /(?:Pin\s+Transaksi|Pin\s+BCA-?ID)[ \t:]*([0-9]{4,10})/i,

      // 4. OCBC Nyala
      ocbcNyalaUser: /(?:User|ID|Account|Login|Username)\s*(?:Nyala|NYALA|OCBC)[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      ocbcNyalaPassword: /(?:Pass(?:word)?|Kata\s*Sandi)\s*(?:Nyala|NYALA|OCBC)[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      ocbcNyalaPin: /(?:PIN?|Pin\s*Login|Pin\s*Transaksi)\s*(?:Nyala|NYALA)?[ \t:]*([0-9]{4,10})/i,

      // 5. Generic / Multi-bank Mobile (BNI, Mandiri, BRI fallback, etc)
      mobileUser: /(?:User\s*ID|Username|Account|Login|User|ID)\s*(?:M-?Banking|Wondr|WON|Livin|BRIMO|Nyala|Mobile)?\s*[ \t:]+([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      mobilePassword: /(?:Pass(?:word)?|Kata\s*Sandi|Password)\s*(?:M-?Banking|Wondr|WON|Livin|BRIMO|Nyala|Mobile)?\s*[ \t:]+([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      mobilePin: /(?:Pin|PIN)\s*(?:Mobile|M-BCA|M\s*BCA|Mobile\s*BCA|M-Bank|Livin|Wondr|WON|BRIMO|Nyala|Login|Transaksi)?\s*[ \t:]*([0-9]{4,10})/i,

      // 6. IB Credentials
      ibUser: /User\s+I-?Banking[ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]*)/i,
      ibPin: /Pin\s+I-?Banking[ \t:]*([0-9]{4,10})?/i,

      // 7. Basic Fields
      nik: /NIK[ \t:]*([0-9\-\s]{16,25})/i,
      nama: /Nama[ \t:]*([A-Za-z0-9\s\.\:\'\"\(\)\-\&\/]+?)(?:\s+Ibu|\s+Tempat|\s+No\.|\n|$)/i,
      namaIbuKandung: /(?:Nama\s*)?Ibu\s*Kandung[ \t:]*([A-Za-z0-9\s\.\:\'\"\(\)\-\&\/]+?)(?:\s+Tempat|\s+No\.|\n|$)/i,
      tempatTanggalLahir: /(?:Tempat|Tpat)?.*(?:Tanggal|Tgl)?.*Lahir[ \t:]*([A-Za-z0-9\s\.\:\'\"\(\)\-\&\/\,]+?)(?:\s+No\.|\n|$)/i,
      noRek: /(?:No.*?Rek(?:ening)?|No\.?Rek)[ \t:]*([0-9\s\-]{8,25})/i,
      jenisRekening: /(?:Jenis\s*Rekening|Tipe\s*Rekening|Account\s*Type)[ \t:]*([A-Za-z0-9\s]+?)(?:\s+No\.|\s+No\s*ATM|\n|$)/i,
      noAtm: /(?:No\.?\s*(?:ATM|Kartu(?:\s+Debit)?)|Nomor\s*(?:ATM|Kartu)|No\.?\s*Kartu)[ \t:]*([0-9\s\-]{16,25})(?:\s*\(([0-9\/\s\-]+?)\))?/i,
      validThru: /(?:Valid(?:\s*Thru)?|Valid(?:\s*Kartu)?|Valid(?:\s*SD)|Exp(?:ire)?(?:d)?(?:\s*Date)?|Masa\s*Aktif|Berlaku\s*Sampai)[ \t:]*([0-9\/\-]{4,10})/i,
      noHp: /(?:No.*HP|Nomor.*HP)[ \t:]*([0-9+\-\s]+)/i,
      pinAtm: /(?:(?:U-)?PIN(?:\s+ATM)?|PIN(?:\s+Kartu)?|PIN\s+Transaksi\s+ATM)[ \t:]*([0-9\s\-]{4,10})/i,
      email: /Email[ \t:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      bank: /(?:^|\s)(?<!cabang\s)(?:Bank|Nama\s?Bank)[ \t:]*([A-Za-z\s]+?)(?:\s*\((?:Grade\s+)?([^)]+?)\))?(?:\s+Grade|\s+KCP|\s+Kantor\s+Cabang|\n|$)/i,
      grade: /(?:^|\s)Grade[ \t:]*([A-Z])(?:\s*\([^)]*\))?/i,
      kcp: /(?:KCP|Kantor\s+Cabang|Cabang(?:\s+Bank)?|Cabang)[ \t:]*([A-Za-z0-9\s\-\.]+?)(?:\s+(?:NIK|Grade)|\n|$)/i,
      noOrder: /(?:No\s*\.?\s*ORDER|No\s*Order)[ \t:]*[(\[]?\s*([^\]\)\n]+?)(?:\s+NIK|\s+Nama|\n|$|[)\]])/i,
      codeAgen: /(?:Code\s*Agen|Kode\s*Orlap|Kode\s*Agen)[ \t:]*[(\[]?([A-Za-z0-9\-]+)[)\]]?/i,
      customer: /(?:Customer|Pelanggan)[ \t:]*[(\[]?([A-Za-z0-9\s]+?)[)\]]?(?:\s+NIK|\s+Nama|\n|$)/i,
      passEmail: /Pass\s+Email[ \t:]*([A-Za-z0-9!@#$%^&* .\-_@]+)/i,
      merchantUser: /(?:User|ID|Username)\s*(?:Merchant|Qris)\s*[:=][ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
      merchantPassword: /(?:Pass(?:word)?|Kata\s*Sandi)\s*(?:Merchant|Qris)\s*[:=][ \t:]*([A-Za-z0-9!@#$%\^&*.\-_]+)/i,
    };

    const extractedData = {};
    Object.keys(patterns).forEach(key => {
      const match = blockText.match(patterns[key]);
      if (match && match[1]) {
        extractedData[key] = match[1].trim();

        // Secondary capture groups for combined fields
        if (key === 'bank' && match[2] && (!extractedData.grade || extractedData.grade === '-')) {
          extractedData.grade = match[2].trim();
        }

        // Extract Valid Thru from No. Kartu line if present in brackets
        if (key === 'noAtm') {
          const fullMatch = match[0];
          const parenMatch = fullMatch.match(/\(([^)]+)\)/);
          if (parenMatch && parenMatch[1] && (!extractedData.validThru || extractedData.validThru === '-')) {
            extractedData.validThru = parenMatch[1].trim();
          }
          // Clean up noAtm if it captured the bracket part
          if (extractedData.noAtm.includes('(')) {
            extractedData.noAtm = extractedData.noAtm.split('(')[0].trim();
          }
        }
      } else {
        // Default value for missing fields only if not already set (e.g. by composite fields)
        if (!extractedData[key]) {
          extractedData[key] = '-';
        }
      }
    });

    // Auto-detect QRIS for BRI if merchant fields are extracted
    if ((extractedData.merchantUser && extractedData.merchantUser !== '-') ||
      (extractedData.merchantPassword && extractedData.merchantPassword !== '-')) {
      if (extractedData.bank?.toUpperCase().includes('BRI')) {
        extractedData.jenisRekening = 'QRIS';
      }
    }

    const cleanNumeric = (str) => {
      if (!str || str === '-') return '-';
      return str.replace(/[\s\-\.]/g, '');
    };
    extractedData.noHp = cleanNumeric(extractedData.noHp);
    extractedData.noRek = cleanNumeric(extractedData.noRek);
    extractedData.nik = cleanNumeric(extractedData.nik);
    extractedData.noAtm = cleanNumeric(extractedData.noAtm);
    extractedData.pinAtm = cleanNumeric(extractedData.pinAtm);

    // Date parsing removed to use manual input
    extractedData.expired = null;

    if (extractedData.noOrder || extractedData.nik) products.push(extractedData);
  });
  return products;
};

const processDocumentFile = async (filePath) => {
  try {
    const extension = path.extname(filePath).toLowerCase();
    logger.info('Processing document file', { filePath, extension });

    let text = '';
    let htmlContent = null;
    let products = [];
    let sheetData = null;

    if (extension === '.pdf') {
      const pdfBuffer = fs.readFileSync(filePath);

      // Try built-in table extraction first
      const extractedTable = await extractTablesFromPDF(pdfBuffer);
      if (extractedTable && extractedTable.length > 0) {
        logger.info('Extracted structured table from PDF using advanced parser');
        products = parseTableData(extractedTable);
      }

      if (products.length === 0) {
        // Fallback to text parsing
        text = await extractTextFromPDF(pdfBuffer);

        // DEBUG: Log first 1000 chars to help debug layout
        logger.info('PDF Extracted Text (Detailed):', {
          textLength: text.length,
          sample: text.substring(0, 500)
        });

        // In PDF, columns are often separated by multiple spaces or single space
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const rows = lines.map(line => {
          let cells = line.split(/\s{2,}|\t/).map(c => c.trim()).filter(c => c.length > 0);
          if (cells.length < 3 && line.toLowerCase().includes('nik') && line.toLowerCase().includes('nama')) {
            cells = line.split(/\s+/).map(c => c.trim()).filter(c => c.length > 0);
          }
          return cells;
        });

        const potentialTableRows = rows.filter(r => r.length > 3);
        if (potentialTableRows.length >= 1) {
          logger.info('Detected potential table/grid structure in PDF text');
          products = parseTableData(rows);
          if (products.length === 0) {
            products = parseProductData(text);
          }
        } else {
          products = parseProductData(text);
        }
      }



      // Extract images from PDF and upload to Cloudinary
      if (products.length > 0) {
        try {
          logger.info('Attempting to extract images from PDF...');
          const images = await extractImagesFromPDF(pdfBuffer);

          if (images.length > 0) {
            logger.info(`Found ${images.length} images in PDF, uploading to Cloudinary...`);

            // Distribute images to products (assuming 2 images per product: KTP then Selfie)
            for (let i = 0; i < images.length; i++) {
              const productIndex = Math.floor(i / 2);
              if (!products[productIndex]) break;

              const isEven = i % 2 === 0;
              const fieldName = isEven ? 'uploadFotoId' : 'uploadFotoSelfie';
              const label = isEven ? 'KTP' : 'Selfie';
              const img = images[i];

              try {
                // Upload to Cloudinary
                const timestamp = Date.now();
                const random = Math.floor(Math.random() * 1e9);
                const publicId = `secure_${timestamp}_${random}`;

                const uploadResult = await uploadBufferToCloudinary(img.buffer, {
                  public_id: publicId,
                  transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
                });

                if (uploadResult && uploadResult.secure_url) {
                  products[productIndex][fieldName] = uploadResult.secure_url;
                  logger.info(`Successfully uploaded ${label} for product ${productIndex + 1} to Cloudinary: ${uploadResult.secure_url}`);
                } else {
                  // Fallback to base64 for preview
                  const base64 = `data:image/${img.format || 'jpeg'};base64,${img.buffer.toString('base64')}`;
                  products[productIndex][fieldName] = base64;
                  logger.warn(`Cloudinary failed, using base64 fallback for ${label} product ${productIndex + 1}`);
                }
              } catch (uploadErr) {
                // Fallback to base64 for preview on error too
                const base64 = `data:image/${img.format || 'jpeg'};base64,${img.buffer.toString('base64')}`;
                products[productIndex][fieldName] = base64;
                logger.warn(`Failed to upload image ${i} (${label}) to Cloudinary, using base64 fallback:`, { error: uploadErr.message });
              }
            }
          } else {
            logger.info('No images found in PDF');
          }
        } catch (imgErr) {
          logger.warn('PDF image extraction warning:', imgErr.message);
        }
      }
    } else {
      const parseResult = await parseDocument(filePath);
      if (!parseResult.success) throw new Error(parseResult.error);
      text = parseResult.text || '';
      htmlContent = parseResult.html || null;
      sheetData = parseResult.sheetData;

      if (sheetData && parseResult.hasTable) {
        products = parseTableData(sheetData);
      } else {
        products = parseProductData(text);
      }

      // Extract images for Word documents
      if (extension === '.docx' && htmlContent && products.length > 0) {
        try {
          logger.info(`Starting Word image extraction for ${products.length} products...`);
          const images = extractImagesFromHtml(htmlContent);
          if (images.length > 0) {
            logger.info(`Found ${images.length} images, starting Cloudinary uploads...`);
            // Use Promise.all for parallel uploads
            await Promise.all(images.map(async (img) => {
              if (products[img.productIndex]) {
                logger.info(`Processing image for product ${img.productIndex + 1} (${img.type})...`);
                const imageUrl = await uploadImageToCloudinary(img.base64);

                const finalUrl = imageUrl || img.base64; // Fallback to base64 for preview if upload fails

                if (img.type === 'uploadFotoId') products[img.productIndex].uploadFotoId = finalUrl;
                else if (img.type === 'uploadFotoSelfie') products[img.productIndex].uploadFotoSelfie = finalUrl;

                if (imageUrl) {
                  logger.info(`Successfully assigned Cloudinary URL to products[${img.productIndex}].${img.type}`);
                } else {
                  logger.warn(`Cloudinary failed, using base64 fallback for product ${img.productIndex + 1} (${img.type})`);
                }
              } else {
                logger.warn(`Product index ${img.productIndex} out of range for ${products.length} products`);
              }
            }));
          } else {
            logger.info('No images extracted from Word HTML');
          }
        } catch (e) {
          logger.warn('Word image extraction warning:', e.message);
        }
      }
    }

    const validationResult = validateExtractedData(products);
    return { success: true, ...validationResult };

  } catch (error) {
    logger.error('Document processing failed', { error: error.message });
    return { success: false, validProducts: [], errors: [], summary: { total: 0, valid: 0, invalid: 0 }, error: error.message };
  }
};

// Helper: Normalize header untuk flexible matching
const normalizeHeaderCell = (cell) => {
  return String(cell)
    .trim()
    .toLowerCase()
    .replace(/[-\/().\[\]:*"']/g, ' ')  // Replace special chars including quotes & asterisks
    .replace(/\s+/g, ' ')               // Normalize multiple spaces to single
    .trim();
};

// Helper: Smart header matching dengan pattern & keywords
const matchHeaderToField = (headerCell) => {
  const normalized = normalizeHeaderCell(headerCell);
  matchHeaderToField.lastMatchedIndex = 999; // Reset to a high value

  // Pattern-based matching untuk fleksibilitas
  const patterns = [
    // ============ BRI BRIMO - Explicit patterns FIRST ============
    { regex: /brimo\s+user|user\s+brimo|id\s+brimo|account\s+brimo/i, field: 'brimoUser' },
    { regex: /brimo\s+(?:pass|password)|pass\s+brimo|password\s+brimo|brimo\s+pass/i, field: 'brimoPassword' },
    { regex: /brimo\s+pin|pin\s+brimo/i, field: 'brimoPin' },

    // ============ BRI QRIS/MERCHANT ============
    { regex: /merchant\s+user|user\s+merchant|qris\s+user|user\s+qris|id\s+(?:merchant|qris)/i, field: 'briMerchantUser' },
    { regex: /merchant\s+(?:pass|password)|(?:pass|password)\s+merchant|qris\s+(?:pass|password)|(?:pass|password)\s+qris/i, field: 'briMerchantPassword' },

    // ============ BNI WONDR ============
    { regex: /wondr\s+user|user\s+wondr|id\s+wondr/i, field: 'mobileUser' },
    { regex: /wondr\s+(?:pass|password)|pass\s+wondr|password\s+wondr|wondr\s+pass/i, field: 'mobilePassword' },
    { regex: /(?:m-?pin|pin)\s+wondr|wondr\s+(?:m-?pin|pin)/i, field: 'mobilePin' },

    // ============ MANDIRI LIVIN ============
    { regex: /livin\s+user|user\s+livin|id\s+livin|account\s+livin|user\s+id\s+livin|acc\s+livin/i, field: 'mobileUser' },
    { regex: /livin\s+(?:pass|password)|pass\s+livin|password\s+livin|login\s+livin/i, field: 'mobilePassword' },
    { regex: /livin\s+pin|pin\s+livin|transaksi\s+livin/i, field: 'mobilePin' },

    // ============ OCBC NYALA ============
    { regex: /nyala\s+user|user\s+nyala|id\s+nyala|account\s+nyala|yala\s+user|user\s+id\s+nyala/i, field: 'ocbcNyalaUser' },
    { regex: /nyala\s+(?:pass|password)|pass\s+nyala|password\s+nyala|pass\s+login|password\s+login/i, field: 'ocbcNyalaPassword' },
    { regex: /nyala\s+pin|pin\s+nyala|pin\s+login/i, field: 'ocbcNyalaPin' },

    // ============ BCA Specific ============
    { regex: /kode\s+akses/i, field: 'kodeAkses' },
    { regex: /kode\s+akses\s+m\s*bca/i, field: 'kodeAkses' },
    { regex: /pin\s+m\s*bca|pin\s+mobile\s+bca/i, field: 'pinMBca' },
    { regex: /(?:pass|password)\s+(?:bca\s*id|my\s*bca)/i, field: 'myBCAPassword' },
    { regex: /pin\s+(?:keybca|bcakey|soft)|(?:keybca|soft)\s+pin|^keybca$|pin\s+key\s*bca/i, field: 'pinKeyBCA' },
    { regex: /pin\s+(?:bca[\s-]?id|my\s*bca|transaksi)/i, field: 'myBCAPin' },
    { regex: /(?:user\s+)?(?:bca\s*id|my\s*bca)|id\s+(?:bca\s*id|my\s*bca)/i, field: 'myBCAUser' },

    // ============ GENERIC Mobile / IB ============
    { regex: /user\s+(m\s*banking|mobile|id|account|m\s*bank)|(mobile|m\s*banking|acc|m\s*bank)\s+user|id\s+user/i, field: 'mobileUser' },
    { regex: /pass\s+(m\s*banking|mobile|m\s*bank)|password\s+(mobile|m\s*banking|m\s*bank)|pin\s+login|password\s+login|pass\s+mobile\s+m\s*bank/i, field: 'mobilePassword' },
    { regex: /pin\s+(mobile|m\s*bank|banking|transaksi)|pin\s+login|pin\s+mobile\s+m\s*bank/i, field: 'mobilePin' },

    { regex: /(?:pass|password)\s+(?:i\s*banking|i\s*bank|\bib\b|internet\s+banking)|password\s+(?:internet\s+banking|i\s*banking|\bib\b)/i, field: 'ibPassword' },
    { regex: /pin\s+(?:i\s*banking|i\s*bank|\bib\b|internet\s+banking)/i, field: 'ibPin' },
    { regex: /(?:user\s+)?(?:i\s*banking|i\s*bank|\bib\b|internet\s+banking)/i, field: 'ibUser' },

    // Basic headers
    { regex: /^(?:no|nomor)\s*(?:order|pesanan)|order\s*number/i, field: 'noOrder' },
    { regex: /code\s*agen|kode\s*(?:agen|orlap)|kode\s*orlap/i, field: 'codeAgen' },
    { regex: /^nik|nomor\s+induk\s+kependudukan|identitas|no\s*nik/i, field: 'nik' },
    { regex: /^nama$|nama\s+lengkap|nama\s+sesuai\s+ktp|account\s*holder|nama\s*pemilik/i, field: 'nama' },
    { regex: /(?:nama\s*)?ibu\s+kandung|nama\s+ibu\s+kandung|mother\s*name|ibu\s*kandung/i, field: 'namaIbuKandung' },
    { regex: /tempat.*(?:tgl|tanggal).*lahir|ttl|dob|birth\s*date/i, field: 'tempatTanggalLahir' },
    { regex: /^bank$|nama\s+bank/i, field: 'bank' },
    { regex: /no\s+hp|nomor\s+hp|nomor\s+handphone|phone\s*number|mobile\s*number/i, field: 'noHp' },
    { regex: /no\s+rek|nomor\s+rekening|rekening|account\s*number/i, field: 'noRek' },
    { regex: /no\s+atm|nomor\s+atm|nomor\s+kartu|card\s*number/i, field: 'noAtm' },
    { regex: /valid\s+thru|valid\s+kartu|expire|masa\s+aktif|berlaku/i, field: 'validThru' },
    { regex: /pin\s+atm|u\s*pin|pin\s+kartu|atm\s*pin/i, field: 'pinAtm' },
    { regex: /kcp|kantor\s+cabang|cabang|branch/i, field: 'kcp' },
    { regex: /pass\s+email|password\s+email/i, field: 'passEmail' },
    { regex: /email/i, field: 'email' },
    { regex: /foto\s+ktp|identitas|upload\s+foto\s+id|upload\s*foto\s*ktp/i, field: 'uploadFotoId' },
    { regex: /foto\s+selfie|wajah|upload\s+foto\s+selfie|upload\s*foto\s*selfie/i, field: 'uploadFotoSelfie' },
    { regex: /foto\s+ktp|upload\s+foto\s+ktp/i, field: 'uploadFotoId' },
    { regex: /foto\s+selfie|upload\s+foto\s+selfie/i, field: 'uploadFotoSelfie' },
    { regex: /^grade$|grade\s+kartu/i, field: 'grade' },
    { regex: /customer|pelanggan/i, field: 'customer' },
    { regex: /validasi|status/i, field: 'status' },
    { regex: /jenis\s+rekening|rekening\s+type|tipe\s+rekening/i, field: 'jenisRekening' },
    { regex: /field\s+staff|orlap|petugas\s+lapangan/i, field: 'fieldStaff' },
    { regex: /sisa\s+saldo|saldo|balance|rem\s*balance/i, field: 'sisaSaldo' },
    { regex: /user\s+mobile\s+m\s*bank/i, field: 'mobileUser' },

    // ============ GENERIC FALLBACKS (at the end) ============
    { regex: /^user$|^username$|^user\s*id$|^userid$|^id\s*user$|^user\s*login$|^login\s*id$/i, field: 'mobileUser' },
    { regex: /^pass$|^password$|^kata\s*sandi$|^sandi$|^passw$/i, field: 'mobilePassword' },
    { regex: /^pin$/i, field: 'mobilePin' },
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (pattern.regex.test(normalized)) {
      matchHeaderToField.lastMatchedIndex = i;
      // Return field name if matched (could be null for "User M-BCA" to skip)
      return pattern.field !== undefined ? pattern.field : null;
    }
  }

  // Fallback: return undefined if no pattern matched (signals: not a recognized field)
  return undefined;
};

const parseTableData = (tableData) => {
  const products = [];
  if (!tableData || tableData.length < 2) return products;

  // Find header row by checking which row contains the most known headers
  let headerRowIndex = -1;
  let maxMatchedHeaders = 0;
  let detectedHeaders = [];

  for (let i = 0; i < Math.min(tableData.length, 10); i++) {
    const row = tableData[i];
    if (!row) continue;

    let matches = 0;
    const currentHeaders = [];
    const unmappedHeaders = [];
    row.forEach(cell => {
      const field = matchHeaderToField(cell);
      // Count as match if field was recognized (not undefined)
      const isValidField = field !== undefined;
      if (isValidField) {
        matches++;
      }
      if (field !== undefined && field !== null) {
        currentHeaders.push(field);
      }
      if (field === undefined) {
        unmappedHeaders.push(normalizeHeaderCell(cell));
      }
    });

    // DEBUG: Log BCA-specific headers if detected
    if (currentHeaders.some(h => ['mobilePassword', 'pinMBca', 'ibUser', 'ibPin', 'myBCAUser'].includes(h))) {
      logger.info('BCA-specific headers detected in row', {
        rowIndex: i,
        detectedHeaders: currentHeaders,
        unmappedHeaders
      });
    }

    if (matches > maxMatchedHeaders && matches >= 3) {
      maxMatchedHeaders = matches;
      headerRowIndex = i;
      detectedHeaders = currentHeaders;
    }
  }

  if (headerRowIndex === -1) {
    logger.info('Could not find header row in table data');
    return products;
  }

  logger.info('Found header row', { index: headerRowIndex, matchedFields: maxMatchedHeaders });

  // Build headerMap PRESERVING ORIGINAL COLUMN INDICES
  const headerMap = {};
  const headerRow = tableData[headerRowIndex];
  headerRow.forEach((cell, idx) => {
    const field = matchHeaderToField(cell);
    // Only add to map if field was recognized (not undefined)
    if (field !== undefined && field !== null) {
      headerMap[idx] = {
        field: field,
        isStrong: matchHeaderToField.lastMatchedIndex < 44
      };
    }
  });

  for (let i = headerRowIndex + 1; i < tableData.length; i++) {
    const row = tableData[i];
    const p = {};
    if (!row) continue;
    row.forEach((cell, idx) => {
      const headerInfo = headerMap[idx];
      if (headerInfo) {
        const field = headerInfo.field;
        const cleanValue = String(cell).trim();
        // Skip if empty string to avoid overwriting good values from other potentially matched columns
        if (cleanValue === '') return;

        // Is this a "strong" match or a generic fallback?
        const isStrongMatch = headerInfo.isStrong;
        const currentIsStrong = p[`_${field}_isStrong`] || false;

        // Set if: 
        // 1. Never set before
        // 2. OR currently weakly set but this is a strong match
        // 3. SPECIAL: If this is a numeric field (noRek, nik, etc) and current value is non-numeric (e.g. "Qris")
        //    while the new value is numeric, override it.
        const isNumericField = ['noRek', 'noAtm', 'noHp', 'nik', 'pinAtm', 'mobilePin', 'ibPin', 'brimoPin', 'myBCAPin', 'ocbcNyalaPin'].includes(field);
        const isPureAlpha = /^[A-Za-z\s]+$/.test(cleanValue);

        const currentValue = p[field];
        const currentIsPureAlpha = currentValue ? /^[A-Za-z\s]+$/.test(currentValue) : false;

        if (!currentValue ||
          (!currentIsStrong && isStrongMatch) ||
          (isNumericField && currentIsPureAlpha && !isPureAlpha)) {
          p[field] = cleanValue;
          p[`_${field}_isStrong`] = isStrongMatch;

          // SPECIAL FIX: If we just set Grade and it contains "Code Agen", split it
          if (field === 'grade' && cleanValue.toUpperCase().includes('CODE AGEN')) {
            const parts = cleanValue.split(':');
            if (parts.length > 1) {
              const extractedGrade = parts[0].replace(/Code Agen/i, '').trim().substring(0, 1);
              const extractedCode = parts[1].trim();
              p['grade'] = extractedGrade;
              if (!p['codeAgen'] || p['codeAgen'] === '-') {
                p['codeAgen'] = extractedCode;
              }
            }
          }
        }
      }
    });
    if (p.noHp) p.noHp = p.noHp.replace(/[\s\-]/g, '');
    if (p.noRek) p.noRek = p.noRek.replace(/[\s\-]/g, '');
    if (p.nik) p.nik = p.nik.replace(/[\s\-]/g, '');
    if (Object.keys(p).length > 3) products.push(p);
  }
  return products;
};

const validateExtractedData = (products) => {
  const errors = [];
  const validProducts = [];
  const seenRekening = new Map();  // Track rekening numbers for duplicate detection

  products.forEach((product, index) => {
    const productErrors = [];

    // ========== CRITICAL VALIDATION: NO REKENING ==========
    // 1. No Rekening MUST EXIST
    if (!product.noRek || String(product.noRek).trim() === '' || product.noRek === '-') {
      productErrors.push('noRek is REQUIRED - no rekening data');
      errors.push({
        productIndex: index,
        errors: productErrors,
        data: product,
        reason: 'MISSING_REKENING'
      });
      return;  // Skip further validation if no rekening
    }

    // 2. Clean and normalize noRek for duplicate detection
    const noRekClean = String(product.noRek)
      .replace(/[\s\-()]/g, '')  // Remove spaces, dashes, parentheses
      .trim();

    // 3. Check for DUPLICATE noRek
    if (seenRekening.has(noRekClean)) {
      const firstIndex = seenRekening.get(noRekClean);
      productErrors.push(`Duplicate noRek: "${product.noRek}" (first seen at row ${firstIndex + 1})`);
      errors.push({
        productIndex: index,
        errors: productErrors,
        data: product,
        reason: 'DUPLICATE_REKENING',
        duplicateOf: firstIndex
      });
      return;  // Skip if duplicate
    }

    // Track this rekening as seen
    seenRekening.set(noRekClean, index);
    product.noRekClean = noRekClean;  // Store cleaned version

    // ========== BANK SPECIFIC ALIGNMENT ==========
    const { getBankConfig, getMandatoryFields, getDisplayLabel } = require('../config/bankFieldMapping');
    const bankConfig = getBankConfig(product.bank);
    let bank = bankConfig.name.toUpperCase();

    // Smart Subtype Detection for BRI
    let jenisRekening = product.jenisRekening ? product.jenisRekening.toUpperCase() : null;
    if (bank === 'BRI' && !jenisRekening) {
      const isQris =
        (product.briMerchantUser && product.briMerchantUser !== '-') ||
        (product.briMerchantPassword && product.briMerchantPassword !== '-') ||
        (product.noRek && String(product.noRek).toUpperCase().includes('QRIS'));

      jenisRekening = isQris ? 'QRIS' : 'TABUNGAN';
      product.jenisRekening = jenisRekening;
    } else if (!jenisRekening) {
      jenisRekening = 'TABUNGAN';
    }

    // Smart ATM Expiry Extraction: "7788 8899 6677 5566 (02/32)" -> noAtm: 7788..., validThru: 02/32
    if (product.noAtm) {
      const atmValue = String(product.noAtm).trim();
      const expiryMatch = atmValue.match(/\(([\d\/\s]+)\)/); // Matches (02/32) or (02 / 32)
      if (expiryMatch) {
        const extractedExpiry = expiryMatch[1].trim();
        // Set validThru if not already explicitly set
        if (!product.validThru || product.validThru === '-') {
          product.validThru = extractedExpiry;
        }
        // Clean noAtm by removing the parentheses part
        product.noAtm = atmValue.replace(expiryMatch[0], '').trim();
      }
    }

    // Smart Bank Grade Extraction: "BCA (grade B)" -> bank: BCA, grade: B
    if (product.bank) {
      const bankValue = String(product.bank).trim();
      const gradeMatch = bankValue.match(/\(grade\s+([A-Za-z0-9]+)\)/i);
      if (gradeMatch) {
        const extractedGrade = gradeMatch[1].trim().toUpperCase();
        if (!product.grade || product.grade === '-' || product.grade === '') {
          product.grade = extractedGrade;
        }
        product.bank = bankValue.replace(gradeMatch[0], '').trim();
      }
    }

    // Smart Extraction for merged PIN ATM and User Brimo (common in Word tables)
    if (product.pinAtm) {
      const pinValue = String(product.pinAtm).trim();
      const mergeMatch = pinValue.match(/^([\d\s\-]+)User\s+Brimo\s*:\s*(.+)$/i);
      if (mergeMatch) {
        product.pinAtm = mergeMatch[1].trim();
        if (!product.brimoUser || product.brimoUser === '-' || product.brimoUser === '') {
          product.brimoUser = mergeMatch[2].trim();
        }
      }
    }

    // Map common mobileUser to bank-specific fields if needed
    if (bank === 'BRI') {
      if (!product.brimoUser && product.mobileUser) product.brimoUser = product.mobileUser;
      if (!product.brimoPassword && product.mobilePassword) product.brimoPassword = product.mobilePassword;
      if (!product.brimoPin && product.mobilePin) product.brimoPin = product.mobilePin;
    }

    // Align BNI Wondr (Uses generic mobileUser/mobilePassword/mobilePin)
    // No action needed as they already use the correct fields for BNI

    // ========== OTHER VALIDATIONS ==========
    const mandatoryFields = getMandatoryFields(bank, jenisRekening);

    // DEBUG: Log field extraction for ALL banks (untuk diagnosa field kosong)
    logger.info(`[Bank Extract ${bank}] Product ${index}:`, {
      productIndex: index,
      bank: bank,
      jenisRekening: jenisRekening,
      noRek: product.noRek,
      noRekClean: noRekClean,
      // BCA - M-BCA Mobile Banking (User tidak digunakan, gunakan mobilePassword untuk Kode Akses)
      mobilePassword: product.mobilePassword || 'KOSONG',  // Ini adalah "Kode Akses"
      pinMBca: product.pinMBca || 'KOSONG',                // PIN untuk transaksi
      // BCA - MyBCA / BCA-ID (Internet Banking Corporate)
      myBCAUser: product.myBCAUser || 'KOSONG',
      myBCAPassword: product.myBCAPassword || 'KOSONG',
      myBCAPin: product.myBCAPin || 'KOSONG',
      // I-Banking - HANYA User & Pin (TANPA Password!)
      ibUser: product.ibUser || 'KOSONG',
      ibPin: product.ibPin || 'KOSONG',
      // BRI BRIMO Fields
      brimoUser: product.brimoUser || 'KOSONG',
      brimoPassword: product.brimoPassword || 'KOSONG',
      brimoPin: product.brimoPin || 'KOSONG',
      // BRI QRIS/Merchant Fields
      briMerchantUser: product.briMerchantUser || 'KOSONG',
      briMerchantPassword: product.briMerchantPassword || 'KOSONG',
      // OCBC Fields
      ocbcNyalaUser: product.ocbcNyalaUser || 'KOSONG',
      ocbcNyalaPassword: product.ocbcNyalaPassword || 'KOSONG',
      ocbcNyalaPin: product.ocbcNyalaPin || 'KOSONG',
      // Summary
      nonEmptyFields: Object.keys(product).filter(k => product[k] && product[k] !== '-').length,
      totalFields: Object.keys(product).length
    });

    mandatoryFields.forEach(field => {
      const value = product[field];
      if (!value || String(value).trim() === '' || value === '-') {
        const label = getDisplayLabel(field, bank);
        productErrors.push(`${label} is required for ${bank}`);
      }
    });

    if (product.nik) {
      const nikClean = String(product.nik).replace(/\s+/g, '');
      if (!/^\d{16}$/.test(nikClean)) {
        productErrors.push('NIK must be 16 digits');
      }
    }

    // Email - trim and attempt to extract passEmail if combined
    if (product.email) {
      const emailValue = String(product.email).trim();

      // Handle combined "email@addr.com pass email : password"
      if (emailValue.toLowerCase().includes('pass email')) {
        const parts = emailValue.split(/(?=pass email)/i);
        if (parts.length > 1) {
          product.email = parts[0].trim();
          const passPart = parts[1].replace(/pass email\s*[:\s]*/i, '').trim();
          if (passPart && (!product.passEmail || product.passEmail === '-')) {
            product.passEmail = passPart;
          }
        }
      }

      const emailTrimmed = String(product.email).trim().toLowerCase();
      product.email = emailTrimmed === '-' ? '' : emailTrimmed;  // Remove if just "-"
    }

    if (product.noHp) {
      const hpClean = String(product.noHp).replace(/[\s\-+()]/g, '');
      if (!/^\d{10,15}$/.test(hpClean)) {
        productErrors.push('Phone number format invalid');
      }
    }

    if (productErrors.length === 0) validProducts.push(product);
    else errors.push({ productIndex: index, errors: productErrors, data: product, bank, jenisRekening });
  });
  return { validProducts, errors, summary: { total: products.length, valid: validProducts.length, invalid: errors.length } };
};

module.exports = {
  processPDFFile: processDocumentFile,
  processDocumentFile,
  extractTextFromPDF,
  parseProductData,
  parseTableData,
  matchHeaderToField,
  normalizeHeaderCell,
  validateExtractedData
};