const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const cheerio = require('cheerio');
const { logger } = require('./audit');

// Helper to normalize header keys consistently
const normalizeHeader = (cell) => {
  return String(cell)
    .trim()
    .toLowerCase()
    .replace(/[-\/().\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseListFormat = (text) => {
  try {
    const sections = text.split(/(?=No\s*\.?\s*ORDER)/i);
    const validSections = sections.filter(s => s.trim().length > 0 && s.includes(':'));

    if (validSections.length === 0) return [];

    const headers = [
      'No. Order', 'Code Agen', 'Jenis Rekening', 'Bank', 'Grade', 'Kantor Cabang', 'NIK', 'Nama',
      'Nama Ibu Kandung', 'Tempat/Tanggal Lahir', 'No. Rekening', 'No. ATM',
      'Valid Kartu', 'No. HP', 'PIN ATM', 'Email', 'Password Email', 'Expired',
      // Generic mobile & IB
      'User Mobile', 'Password Mobile', 'PIN Mobile',
      'User IB', 'Pass IB', 'PIN IB',
      // BCA
      'BCA-ID', 'Pass BCA-ID', 'Pin Transaksi', 'Kode Akses', 'Pin m-BCA', 'Pin KeyBCA',
      // BRI
      'User BRImo', 'Pass BRImo', 'PIN BRImo', 'User Merchant', 'Pass Merchant',
      // BNI Wondr
      'User Wondr', 'Password Wondr', 'PIN Wondr',
      // Mandiri Livin
      'User Livin', 'Password Livin', 'PIN Livin',
      // OCBC Nyala
      'User Nyala', 'Password Login', 'Pin Login',
      // Misc
      'Customer', 'Upload Foto ID', 'Upload Foto Selfie'
    ];

    const normalizedMap = {
      'no order': 'No. Order', 'code agen': 'Code Agen', 'kode orlap': 'Code Agen', 'customer': 'Customer', 'pelanggan': 'Customer',
      'validasi': 'Status', 'status': 'Status',
      'bank': 'Bank', 'jenis rekening': 'Jenis Rekening', 'grade': 'Grade',
      'kcp': 'Kantor Cabang', 'kantor cabang': 'Kantor Cabang', 'cabang bank': 'Kantor Cabang',
      'nik': 'NIK', 'nama': 'Nama', 'nama lengkap': 'Nama',
      'ibu kandung': 'Nama Ibu Kandung', 'nama ibu kandung': 'Nama Ibu Kandung',
      'tempat tanggal lahir': 'Tempat/Tanggal Lahir', 'tempat/tanggal lahir': 'Tempat/Tanggal Lahir',
      'ttl': 'Tempat/Tanggal Lahir',
      'no rek': 'No. Rekening', 'no rekening': 'No. Rekening',
      'no atm': 'No. ATM', 'no kartu': 'No. ATM',
      'valid kartu': 'Valid Kartu', 'valid thru': 'Valid Kartu',
      'no hp': 'No. HP', 'nomor hp': 'No. HP',
      'pin atm': 'PIN ATM', 'pin kartu': 'PIN ATM',
      'email': 'Email', 'pass email': 'Password Email',
      'expired': 'Expired',
      // BCA
      'user bca': 'BCA-ID', 'bca id': 'BCA-ID', 'pass bca id': 'Pass BCA-ID', 'mybca': 'BCA-ID', 'password bca id': 'Pass BCA-ID',
      'kode akses': 'Kode Akses', 'pin m bca': 'Pin m-BCA', 'pin key bca': 'Pin KeyBCA', 'pin keybca': 'Pin KeyBCA', 'pin bcakey': 'Pin KeyBCA', 'pin soft': 'Pin KeyBCA', 'keybca pin': 'Pin KeyBCA', 'keybca': 'Pin KeyBCA',
      'pin bca id': 'Pin Transaksi', 'pin bca-id': 'Pin Transaksi',
      // BRI
      'user brimo': 'User BRImo', 'id brimo': 'User BRImo', 'brimo id': 'User BRImo', 'user mobile': 'User BRImo', 'mobile user': 'User BRImo',
      'pass brimo': 'Pass BRImo', 'brimo pass': 'Pass BRImo', 'brimo password': 'Pass BRImo', 'password mobile': 'Pass BRImo',
      'pin brimo': 'PIN BRImo', 'brimo pin': 'PIN BRImo', 'pin mobile': 'PIN BRImo',
      // BNI Wondr
      'user wondr': 'User Wondr', 'id wondr': 'User Wondr', 'wondr id': 'User Wondr', 'user mobile': 'User Wondr', 'mobile user': 'User Wondr',
      'pass wondr': 'Password Wondr', 'wondr pass': 'Password Wondr', 'wondr password': 'Password Wondr', 'password mobile': 'Password Wondr',
      'pin wondr': 'PIN Wondr', 'wondr pin': 'PIN Wondr', 'pin mobile': 'PIN Wondr', 'm pin wondr': 'PIN Wondr', 'mpin wondr': 'PIN Wondr',
      // Mandiri Livin
      'user livin': 'User Livin', 'password livin': 'Password Livin', 'pass livin': 'Password Livin', 'pin livin': 'PIN Livin',
      // OCBC Nyala
      'user nyala': 'User Nyala', 'id nyala': 'User Nyala', 'yala user': 'User Nyala', 'user id nyala': 'User Nyala',
      'user mobile': 'User Mobile', 'mobile user': 'User Mobile', 'user m bank': 'User Mobile',
      'pass nyala': 'Password Login', 'password nyala': 'Password Login', 'pass login': 'Password Login', 'password login': 'Password Login', 'password mobile': 'Password Login', 'password m bank': 'Password Login',
      'pin nyala': 'Pin Login', 'pin login': 'Pin Login', 'pin mobile': 'Pin Login', 'pin m bank': 'Pin Login',
      'user i banking': 'User IB', 'pass i banking': 'Pass IB', 'pin i banking': 'PIN IB',
      // Generic Fallbacks
      // Generic Fallbacks
      'user': 'User Mobile', 'user id': 'User Mobile', 'username': 'User Mobile',
      'user login': 'User Mobile', 'login id': 'User Mobile', 'userid': 'User Mobile',
      'id user': 'User Mobile', 'user mobile': 'User Mobile', 'user m bank': 'User Mobile',
      'account user': 'User Mobile', 'user account': 'User Mobile', 'id login': 'User Mobile',
      'mobile password': 'Password Mobile', 'mobile pass': 'Password Mobile',
      'password mobile': 'Password Mobile', 'pass mobile': 'Password Mobile',
      'password login': 'Password Mobile', 'password m bank': 'Password Mobile',
      'login password': 'Password Mobile', 'pass login': 'Password Mobile',
      'mobile pin': 'PIN Mobile', 'mobile pin livin': 'PIN Mobile',
      'pin mobile': 'PIN Mobile', 'pin login': 'PIN Mobile', 'pin m bank': 'PIN Mobile',
      'pass': 'Password Mobile', 'password': 'Password Mobile', 'sandi': 'Password Mobile',
      'kata sandi': 'Password Mobile', 'passw': 'Password Mobile',
      'pin': 'PIN Mobile', 'pin transaksi': 'PIN Mobile',
      // IB Generic
      'user ib': 'User IB', 'user internet banking': 'User IB', 'user i banking': 'User IB', 'user i-banking': 'User IB',
      'pass ib': 'Pass IB', 'password ib': 'Pass IB', 'password internet banking': 'Pass IB', 'password i-banking': 'Pass IB', 'pass i banking': 'Pass IB',
      'pin ib': 'PIN IB', 'pin internet banking': 'PIN IB', 'pin i-banking': 'PIN IB', 'pin i banking': 'PIN IB',
      'i-banking': 'User IB', 'i banking': 'User IB', 'ib': 'User IB',
      'pass email': 'Password Email', 'password email': 'Password Email',
    };

    const rows = [headers]; // First row is header

    validSections.forEach(section => {
      const rowData = new Array(headers.length).fill('');
      const lines = section.split('\n').map(l => l.trim()).filter(l => l);

      lines.forEach(line => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex > -1) {
          const rawKey = line.substring(0, separatorIndex).trim();
          const value = line.substring(separatorIndex + 1).trim();
          const cleanKey = normalizeHeader(rawKey);

          // Check for direct header match first
          let headerIndex = headers.findIndex(h => normalizeHeader(h) === cleanKey);

          // If not found, check normalizedMap aliases
          if (headerIndex === -1) {
            const canonicalName = normalizedMap[cleanKey];
            if (canonicalName) {
              headerIndex = headers.indexOf(canonicalName);
            }
          }

          if (headerIndex > -1) {
            rowData[headerIndex] = (value === '-' || value === '') ? '' : value;
          }
        }
      });

      if (rowData.some(val => val !== '')) {
        rows.push(rowData);
      }
    });

    return rows.length > 1 ? rows : [];
  } catch (e) {
    console.error('Error parsing list format:', e);
    return [];
  }
};

// Parse Word documents (.docx) - Enhanced to extract tables
const parseWordDocument = async (filePath) => {
  try {
    logger.info('Parsing Word document', { filePath });

    // Try to extract HTML to parse tables
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const html = htmlResult.value;

    // Check if document contains tables
    const $ = cheerio.load(html);
    const tables = $('table');

    if (tables.length > 0) {
      // Extract table data
      const tableData = [];

      tables.first().find('tr').each((i, row) => {
        const rowData = [];
        $(row).find('td, th').each((j, cell) => {
          rowData.push($(cell).text().trim());
        });
        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      });

      logger.info('Word document with table parsed successfully', {
        filePath,
        rows: tableData.length,
        hasTable: true
      });

      return {
        success: true,
        text: html,
        html: html,
        format: 'docx',
        sheetData: tableData,
        hasTable: true
      };
    } else {
      // Fallback to raw text extraction
      const textResult = await mammoth.extractRawText({ path: filePath });
      const text = textResult.value;

      // Try to parse List Format (Label: Value)
      const listData = parseListFormat(text);

      if (listData.length > 0) {
        logger.info('Word document with List format parsed successfully', {
          filePath,
          rows: listData.length,
          hasTable: true
        });

        return {
          success: true,
          text,
          html,
          format: 'docx',
          sheetData: listData,
          hasTable: true
        };
      }

      return {
        success: true,
        text,
        html,
        format: 'docx',
        hasTable: false
      };
    }

  } catch (error) {
    logger.error('Word document parsing failed', { filePath, error: error.message });
    return { success: false, error: `Failed to parse Word document: ${error.message}`, format: 'docx' };
  }
};

// Parse Excel spreadsheets (.xlsx, .xls)
const parseExcelDocument = async (filePath) => {
  try {
    logger.info('Parsing Excel document', { filePath });
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    let targetSheet = workbook.Sheets[sheetNames[0]];

    for (const sheetName of sheetNames) {
      if (sheetName.toLowerCase().includes('product') ||
        sheetName.toLowerCase().includes('data') ||
        sheetName.toLowerCase().includes('produk')) {
        targetSheet = workbook.Sheets[sheetName];
        break;
      }
    }

    const jsonData = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });
    const text = jsonData.map(row => Array.isArray(row) ? row.join('\t') : String(row)).join('\n');

    return { success: true, text, format: 'xlsx', sheetData: jsonData, hasTable: true };
  } catch (error) {
    logger.error('Excel parsing failed', { error: error.message });
    return { success: false, error: error.message, format: 'xlsx' };
  }
};

const parseDocument = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') return parseWordDocument(filePath);
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') return parseExcelDocument(filePath);
  return { success: false, error: 'Unsupported file format' };
};

module.exports = {
  parseDocument,
  parseWordDocument,
  parseExcelDocument,
  normalizeHeader
};