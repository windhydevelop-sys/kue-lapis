const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableCell,
    TableRow,
    WidthType,
    AlignmentType,
    BorderStyle,
    ImageRun,
    HeadingLevel,
    SectionType
} = require('docx');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { logger } = require('./audit');

/**
 * Sanitizes text to remove control characters that are invalid in OpenXML/Word.
 * XML 1.0 does not allow characters in the range 0x00-0x1F except 0x09, 0x0A, 0x0D.
 */
const sanitizeText = (text) => {
    if (typeof text !== 'string') return String(text || '');
    // Replace all control characters except tab, newline, and carriage return with a space or empty string
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
};

/**
 * Generate Word template for bulk product upload
 * Creates a .docx file with a table containing all required and optional fields
 */
const generateWordTemplate = async () => {
    try {
        logger.info('Generating Word template for bulk upload');

        const headers = [
            'No. Order', 'Code Agen', 'Customer', 'Bank', 'Grade', 'Kantor Cabang', 'NIK', 'Nama',
            'Nama Ibu Kandung', 'Tempat/Tanggal Lahir', 'No. Rekening', 'No. ATM',
            'Valid Kartu', 'No. HP', 'PIN ATM', 'Email', 'Password Email', 'Expired',
            'User Mobile', 'Password Mobile', 'PIN Mobile',
            'I-Banking', 'Password IB', 'PIN IB', 'Pin KeyBCA'
        ];

        // Sample data row
        const sampleData = [
            'ORDER-001', 'AGENT-001', 'PT. Contoh Customer', 'BRI', 'PREMIUM', 'CABANG-JAKARTA',
            '3201010101010001', 'Ahmad Susanto', 'Siti Aminah', 'Jakarta, 01 Januari 1990',
            '123456789012', '1234567890123456', '12/25', '081234567890', '1234', '5678',
            'SecurePass123!', 'ahmad@example.com', 'EmailPass456!', '2025-12-31',
            'userbrimo', 'BrimoPass789!', '9012', '', '', '', '123456'
        ];

        // Create table rows
        const tableRows = [];

        // Header row
        const headerCells = headers.map(header =>
            new TableCell({
                children: [new Paragraph({ text: header, alignment: AlignmentType.CENTER })],
                shading: { fill: '4472C4' },
                width: { size: 2500, type: WidthType.DXA }
            })
        );
        tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));

        // Sample data row
        const dataCells = sampleData.map(data =>
            new TableCell({
                children: [new Paragraph({ text: data })],
                width: { size: 2500, type: WidthType.DXA }
            })
        );
        tableRows.push(new TableRow({ children: dataCells }));

        // Empty row for user to fill
        const emptyCells = headers.map(() =>
            new TableCell({
                children: [new Paragraph({ text: '' })],
                width: { size: 2500, type: WidthType.DXA }
            })
        );
        tableRows.push(new TableRow({ children: emptyCells }));

        // Create table
        const table = new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
        });

        // Create document
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        text: 'Template Bulk Upload Produk Bank',
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        text: 'Instruksi Penggunaan:',
                        heading: HeadingLevel.HEADING_2
                    }),
                    ...[
                        '1. Isi data produk pada baris kosong di bawah contoh data',
                        '2. Satu baris = satu produk',
                        '3. Field yang wajib diisi: NIK, Nama, Nama Ibu Kandung, Tempat/Tanggal Lahir, No. Rekening, No. ATM, Valid Thru, No. HP, PIN ATM, Email, Password Email, Expired',
                        '4. Field bank-specific (User Mobile, Password Mobile, dll) isi sesuai bank yang dipilih',
                        '5. Format NIK: 16 digit angka (contoh: 3201010101010001)',
                        '6. Format No. ATM: 16 digit angka (contoh: 1234567890123456)',
                        '7. Format Valid Thru: MM/YY (contoh: 12/25)',
                        '8. Format Expired: YYYY-MM-DD (contoh: 2025-12-31)',
                        '9. Setelah selesai, upload file ini melalui menu Bulk Upload'
                    ].map(instr => new Paragraph({ text: instr })),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        text: 'Tabel Data Produk:',
                        heading: HeadingLevel.HEADING_2
                    }),
                    new Paragraph({ text: '' }),
                    table
                ]
            }]
        });

        // Generate buffer
        const buffer = await Packer.toBuffer(doc);
        return { success: true, buffer, filename: 'template-bulk-upload-produk.docx' };

    } catch (error) {
        logger.error('Failed to generate Word template', { error: error.message, stack: error.stack });
        return { success: false, error: error.message };
    }
};

/**
 * Generate a bank-specific Word template for bulk upload (List Format)
 */
const generateBankSpecificTemplate = async (bankName) => {
    try {
        const bank = (bankName || '').toUpperCase();
        logger.info(`Generating ${bank} Word template in List format`);

        let fields = [
            { label: 'No. Order', sample: `ORDER-${bank}-001` },
            { label: 'Code Agen', sample: 'GG' },
            { label: 'Customer', sample: 'PELANGGAN-A' },
            { label: 'Bank', sample: bank || 'BRI' },
            { label: 'Grade', sample: 'VIP' },
            { label: 'Kantor Cabang', sample: 'CABANG-JAKARTA' },
            { label: 'NIK', sample: '3201010101010001' },
            { label: 'Nama', sample: 'NAMA LENGKAP' },
            { label: 'Nama Ibu Kandung', sample: 'NAMA IBU' },
            { label: 'Tempat/Tanggal Lahir', sample: 'Jakarta, 01-01-1990' },
            { label: 'No. Rekening', sample: '1234567890' },
            { label: 'No. ATM', sample: '1234567890123456' },
            { label: 'Valid Kartu', sample: '12/29' },
            { label: 'No. HP', sample: '081234567890' },
            { label: 'PIN ATM', sample: '123456' },
            { label: 'Email', sample: 'user@gmail.com' },
            { label: 'Password Email', sample: 'pass123' },
            { label: 'Expired', sample: '2026-12-31' }
        ];

        if (bank === 'BCA') {
            fields.push(
                { label: 'Kode Akses M-BCA', sample: 'kodeakses123' },
                { label: 'Pin m-BCA', sample: '123456' },
                { label: 'BCA-ID', sample: 'USERBCA01' },
                { label: 'Pass BCA-ID', sample: 'PassBca123' },
                { label: 'Pin Transaksi', sample: '123456' },
                { label: 'Pin KeyBCA', sample: '123456' }
            );
        } else if (bank === 'BRI') {
            fields.push(
                { label: 'User BRImo', sample: 'userbri01' },
                { label: 'Pass BRImo', sample: 'PassBri123' },
                { label: 'PIN BRImo', sample: '123456' },
                { label: 'User Merchant', sample: '' },
                { label: 'Pass Merchant', sample: '' }
            );
        } else if (bank === 'BNI') {
            fields.push(
                { label: 'User Wondr', sample: 'userwondr01' },
                { label: 'Password Wondr', sample: 'PassWondr123' },
                { label: 'PIN Wondr', sample: '123456' },
                { label: 'User IB', sample: 'userib01' },
                { label: 'Pass IB', sample: 'PassIB123' },
                { label: 'PIN IB', sample: '123456' }
            );
        } else if (bank === 'MANDIRI') {
            fields.push(
                { label: 'User Livin', sample: 'userlivin01' },
                { label: 'Password Livin', sample: 'PassLivin123' },
                { label: 'PIN Livin', sample: '123456' },
                { label: 'User IB', sample: 'userib01' },
                { label: 'Pass IB', sample: 'PassIB123' },
                { label: 'PIN IB', sample: '123456' }
            );
        } else if (bank === 'OCBC' || bank === 'OCBC NISP') {
            fields.push(
                { label: 'User Nyala', sample: 'usernyala01' },
                { label: 'Password Nyala', sample: 'PassNyala123' },
                { label: 'PIN Nyala', sample: '123456' },
                { label: 'User IB', sample: 'userib01' },
                { label: 'Pass IB', sample: 'PassIB123' },
                { label: 'PIN IB', sample: '123456' }
            );
        } else if (bank === 'CIMB' || bank === 'CIMB NIAGA') {
            fields.push(
                { label: 'User Mobile', sample: 'usercimb01' },
                { label: 'Password Mobile', sample: 'PassCimb123' },
                { label: 'PIN Mobile', sample: '123456' },
                { label: 'User IB', sample: 'userib01' },
                { label: 'Pass IB', sample: 'PassIB123' },
                { label: 'PIN IB', sample: '123456' }
            );
        } else if (bank === 'PERMATA') {
            fields.push(
                { label: 'User Mobile', sample: 'userpermata01' },
                { label: 'Password Mobile', sample: 'PassPermata123' },
                { label: 'PIN Mobile', sample: '123456' },
                { label: 'User IB', sample: 'userib01' },
                { label: 'Pass IB', sample: 'PassIB123' },
                { label: 'PIN IB', sample: '123456' }
            );
        } else {
            // Default: BTN, DANAMON, dan bank lainnya
            fields.push(
                { label: 'User Mobile', sample: `USER${bank}01` },
                { label: 'Password Mobile', sample: 'Pass123!' },
                { label: 'PIN Mobile', sample: '123456' },
                { label: 'User IB', sample: 'USERIB01' },
                { label: 'Pass IB', sample: 'PassIB123' },
                { label: 'PIN IB', sample: '123456' }
            );
        }

        fields.push({ label: 'Foto KTP', sample: '' }, { label: 'Foto Selfie', sample: '' });

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: `DATA PRODUK - ${bank || 'GENERAL'}`, bold: true, size: 28 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                    }),
                    ...fields.map(field =>
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${field.label}: `, bold: true, size: 22 }),
                                new TextRun({ text: field.sample, size: 22 }),
                            ],
                            spacing: { after: 120 },
                        })
                    ),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "\nCatatan: Silakan ubah data di atas dengan data yang benar. Pastikan format Label: Nilai tetap dipertahankan agar dapat dibaca sistem.",
                                size: 16,
                                italic: true,
                            }),
                        ],
                        spacing: { before: 400 },
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        return { success: true, buffer, filename: `template-upload-${bank.toLowerCase() || 'general'}.docx` };
    } catch (error) {
        logger.error(`Error generating ${bankName} Word template`, error);
        return { success: false, error: error.message };
    }
};

/**
 * Retrieves image data from a URL or local path and returns a Buffer.
 */
const getImageBuffer = async (src) => {
    if (!src || src === '-' || src === '') return null;

    logger.info(`[getImageBuffer] Attempting to load image. Source: "${src}" (type: ${typeof src})`);

    try {
        // 1. If it's a URL, try fetching remotely first
        if (src.toString().startsWith('http')) {
            logger.info(`[getImageBuffer] Source is URL, fetching remotely: ${src}`);
            try {
                const response = await axios.get(src, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                logger.info(`[getImageBuffer] Remote fetch SUCCESS (${response.data.byteLength} bytes)`);
                return Buffer.from(response.data);
            } catch (fetchErr) {
                logger.warn(`[getImageBuffer] Remote fetch FAILED: ${fetchErr.message}. Trying local fallback...`);
                // Fall through to local file search below
            }
        }

        // 2. Extract filename from src (handles URLs, paths, and plain filenames)
        const filename = path.basename(src.split('?')[0]);
        logger.info(`[getImageBuffer] Extracted filename: "${filename}"`);

        // 3. Try multiple local paths
        const searchPaths = [
            path.join(__dirname, '../uploads', filename),
            path.join(__dirname, '../../uploads', filename),
            path.join(process.cwd(), 'uploads', filename),
            path.join(process.cwd(), 'backend/uploads', filename),
        ];

        // Also try exact path if src looks like an absolute path
        if (src.startsWith('/') || src.startsWith('C:')) {
            searchPaths.unshift(src);
        }

        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
                logger.info(`[getImageBuffer] FOUND image at: ${searchPath}`);
                return fs.readFileSync(searchPath);
            }
        }

        // 4. Fuzzy search: look for any file in uploads that contains part of the filename
        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
            const allFiles = fs.readdirSync(uploadsDir);
            // Try exact match first, then partial match
            const found = allFiles.find(f => f === filename) ||
                allFiles.find(f => filename.includes(f) || f.includes(filename));
            if (found) {
                const foundPath = path.join(uploadsDir, found);
                logger.info(`[getImageBuffer] FOUND via fuzzy search: ${foundPath}`);
                return fs.readFileSync(foundPath);
            }
            logger.warn(`[getImageBuffer] NOT FOUND in uploads dir (${allFiles.length} files checked). Filename: "${filename}"`);
        } else {
            logger.warn(`[getImageBuffer] Uploads directory does not exist: ${uploadsDir}`);
        }

        logger.warn(`[getImageBuffer] Image file NOT FOUND after all attempts: "${src}"`);
    } catch (err) {
        logger.error(`[getImageBuffer] UNEXPECTED ERROR for "${src}": ${err.message}`, { stack: err.stack });
    }
    return null;
};

/**
 * Adds an image to a given array of paragraphs.
 */
const addImageToParagraphs = async (paragraphs, src, label) => {
    const buffer = await getImageBuffer(src);
    if (!buffer) return;
    try {
        logger.info(`Embedding image in Word: ${label} (Buffer size: ${buffer.length})`);
        paragraphs.push(
            new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 24 })],
                spacing: { before: 200 }
            }),
            new Paragraph({
                children: [new ImageRun({ data: buffer, transformation: { width: 400, height: 300 } })],
                spacing: { after: 200 }
            })
        );
    } catch (err) {
        logger.warn(`Failed to embed image run for ${src}`, { error: err.message });
    }
};

/**
 * Generate Word document from corrected/extracted product data
 */
const generateCorrectedWord = async (products) => {
    try {
        logger.info('Generating Corrected Word document', { count: products.length });

        const commonHeaders = [
            'No. Order', 'Code Agen', 'Bank', 'Jenis Rekening', 'Grade', 'Kantor Cabang', 'NIK', 'Nama',
            'Nama Ibu Kandung', 'Tempat/Tanggal Lahir', 'No. Rekening', 'No. ATM',
            'Valid Kartu', 'No. HP', 'PIN ATM', 'Email', 'Password Email', 'Expired'
        ];

        const commonFieldMap = {
            noOrder: 'No. Order', codeAgen: 'Code Agen', bank: 'Bank', jenisRekening: 'Jenis Rekening',
            grade: 'Grade', kcp: 'Kantor Cabang', nik: 'NIK', nama: 'Nama',
            namaIbuKandung: 'Nama Ibu Kandung', tempatTanggalLahir: 'Tempat/Tanggal Lahir',
            noRek: 'No. Rekening', noAtm: 'No. ATM', validThru: 'Valid Kartu', noHp: 'No. HP',
            pinAtm: 'PIN ATM', email: 'Email', passEmail: 'Password Email', expired: 'Expired'
        };

        // Determine bank-specific fields
        let specificHeaders = [];
        let specificFieldMap = {};

        const banks = [...new Set(products.map(p => (p.bank || '').toUpperCase()))];
        const bank = banks.length === 1 ? banks[0] : 'ALL';

        if (bank === 'BCA') {
            specificHeaders = ['BCA-ID', 'Pass BCA-ID', 'Pin Transaksi', 'Kode Akses M-BCA', 'Pin m-BCA', 'User KlikBCA', 'PIN KlikBCA', 'PIN Transaksi KlikBCA', 'Pin KeyBCA'];
            specificFieldMap = {
                myBCAUser: 'BCA-ID', myBCAPassword: 'Pass BCA-ID', myBCAPin: 'Pin Transaksi',
                kodeAkses: 'Kode Akses M-BCA', pinMBca: 'Pin m-BCA',
                ibUser: 'User KlikBCA', ibPassword: 'PIN KlikBCA', ibPin: 'PIN Transaksi KlikBCA',
                pinKeyBCA: 'Pin KeyBCA'
            };
        } else if (bank === 'BRI') {
            specificHeaders = ['User BRImo', 'Pass BRImo', 'PIN BRImo', 'User Merchant', 'Pass Merchant'];
            specificFieldMap = {
                brimoUser: 'User BRImo', brimoPassword: 'Pass BRImo', mobilePin: 'PIN BRImo',
                briMerchantUser: 'User Merchant', briMerchantPassword: 'Pass Merchant'
            };
        } else if (bank === 'BNI') {
            specificHeaders = ['User Wondr', 'Password Wondr', 'PIN Wondr', 'User IB', 'Pass IB', 'PIN IB'];
            specificFieldMap = {
                mobileUser: 'User Wondr', mobilePassword: 'Password Wondr', mobilePin: 'PIN Wondr',
                ibUser: 'User IB', ibPassword: 'Pass IB', ibPin: 'PIN IB'
            };
        } else if (bank === 'MANDIRI') {
            specificHeaders = ['User Livin', 'Password Livin', 'PIN Livin', 'User IB', 'Pass IB', 'PIN IB'];
            specificFieldMap = {
                mobileUser: 'User Livin', mobilePassword: 'Password Livin', mobilePin: 'PIN Livin',
                ibUser: 'User IB', ibPassword: 'Pass IB', ibPin: 'PIN IB'
            };
        } else if (bank === 'OCBC' || bank === 'OCBC NISP') {
            specificHeaders = ['User Nyala', 'Password Nyala', 'PIN Nyala', 'User IB', 'Pass IB', 'PIN IB'];
            specificFieldMap = {
                ocbcNyalaUser: 'User Nyala', mobilePassword: 'Password Nyala', mobilePin: 'PIN Nyala',
                ibUser: 'User IB', ibPassword: 'Pass IB', ibPin: 'PIN IB'
            };
        } else {
            // Default: CIMB, PERMATA, BTN, DANAMON, and other banks
            specificHeaders = ['User Mobile', 'Password Mobile', 'PIN Mobile', 'User IB', 'Pass IB', 'PIN IB'];
            specificFieldMap = {
                mobileUser: 'User Mobile', mobilePassword: 'Password Mobile', mobilePin: 'PIN Mobile',
                ibUser: 'User IB', ibPassword: 'Pass IB', ibPin: 'PIN IB'
            };
        }

        const headers = [...commonHeaders, ...specificHeaders];
        const fieldMap = { ...commonFieldMap, ...specificFieldMap };

        const tableRows = [];

        // Header row
        tableRows.push(new TableRow({
            tableHeader: true,
            children: headers.map(header =>
                new TableCell({
                    children: [new Paragraph({ text: header, alignment: AlignmentType.CENTER })],
                    shading: { fill: '4472C4' },
                    width: { size: 2500, type: WidthType.DXA }
                })
            )
        }));

        // Data rows
        products.forEach(p => {
            const dataCells = headers.map(header => {
                const key = Object.keys(fieldMap).find(k => fieldMap[k] === header);
                let val = p[key];

                // If empty/null/undefined, use empty string to avoid "-"
                if (val === undefined || val === null || val === '-') {
                    val = '';
                }

                const sanitizedVal = sanitizeText(val);
                return new TableCell({
                    children: [new Paragraph({ text: sanitizedVal })],
                    width: { size: 2500, type: WidthType.DXA }
                });
            });
            tableRows.push(new TableRow({ children: dataCells }));
        });

        // Add Image Section for each product
        const contentChildren = [
            new Paragraph({
                text: 'Hasil Koreksi Data Bulk Upload',
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: '' }),
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            }),
            new Paragraph({ text: '', break: 1 })
        ];

        // Process images for each product (concatenated after table)
        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            const productImages = [];

            await addImageToParagraphs(productImages, p.uploadFotoId, `PRODUCT ${i + 1} - FOTO KTP`);
            await addImageToParagraphs(productImages, p.uploadFotoSelfie, `PRODUCT ${i + 1} - FOTO SELFIE`);

            if (productImages.length > 0) {
                contentChildren.push(
                    new Paragraph({
                        text: `LAMPIRAN FOTO - PRODUK ${i + 1} (${p.nama || '-'})`,
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 }
                    }),
                    ...productImages
                );
            }
        }

        const doc = new Document({
            sections: [{
                children: contentChildren
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        return { success: true, buffer, filename: `hasil-koreksi-${Date.now()}.docx` };

    } catch (error) {
        logger.error('Failed to generate Corrected Word', { error: error.message, stack: error.stack });
        return { success: false, error: error.message };
    }
};

/**
 * Generate Word document from corrected/extracted product data (List Format)
 */
const generateCorrectedWordList = async (products) => {
    try {
        logger.info('Generating Corrected Word List document', { count: products.length });

        const commonStart = [
            { key: 'noOrder', label: 'No. Order' },
            { key: 'codeAgen', label: 'Code Agen' },
            { key: 'bank', label: 'Bank' }
        ];

        const commonEnd = [
            { key: 'grade', label: 'Grade' },
            { key: 'kcp', label: 'Kantor Cabang' },
            { key: 'nik', label: 'NIK' },
            { key: 'nama', label: 'Nama' },
            { key: 'namaIbuKandung', label: 'Nama Ibu Kandung' },
            { key: 'tempatTanggalLahir', label: 'Tempat/Tanggal Lahir' },
            { key: 'noRek', label: 'No. Rekening' },
            { key: 'noAtm', label: 'No. ATM' },
            { key: 'validThru', label: 'Valid Kartu' },
            { key: 'noHp', label: 'No. HP' },
            { key: 'pinAtm', label: 'PIN ATM' },
            { key: 'email', label: 'Email' },
            { key: 'passEmail', label: 'Password Email' },
            { key: 'expired', label: 'Expired' }
        ];

        const sections = await Promise.all(products.map(async (p, idx) => {
            const bank = (p.bank || '').toUpperCase();
            let bankSpecific = [];

            if (bank === 'BCA') {
                bankSpecific = [
                    { key: 'kodeAkses', label: 'Kode Akses M-BCA' },
                    { key: 'pinMBca', label: 'Pin m-BCA' },
                    { key: 'myBCAUser', label: 'BCA-ID (myBCA)' },
                    { key: 'myBCAPassword', label: 'Pass BCA-ID (myBCA)' },
                    { key: 'myBCAPin', label: 'Pin Transaksi (myBCA)' },
                    { key: 'ibUser', label: 'User KlikBCA' },
                    { key: 'ibPassword', label: 'PIN KlikBCA' },
                    { key: 'ibPin', label: 'PIN Transaksi KlikBCA' },
                    { key: 'pinKeyBCA', label: 'Pin KeyBCA' }
                ];
            } else if (bank === 'BRI') {
                bankSpecific = [
                    { key: 'jenisRekening', label: 'Jenis Rekening' },
                    { key: 'brimoUser', label: 'User BRImo' },
                    { key: 'brimoPassword', label: 'Pass BRImo' },
                    { key: 'mobilePin', label: 'PIN BRImo' },
                    { key: 'briMerchantUser', label: 'User Merchant' },
                    { key: 'briMerchantPassword', label: 'Pass Merchant' }
                ];
            } else if (bank === 'BNI') {
                bankSpecific = [
                    { key: 'mobileUser', label: 'User Wondr' },
                    { key: 'mobilePassword', label: 'Password Wondr' },
                    { key: 'mobilePin', label: 'PIN Wondr' },
                    { key: 'ibUser', label: 'User IB' },
                    { key: 'ibPassword', label: 'Pass IB' },
                    { key: 'ibPin', label: 'PIN IB' }
                ];
            } else if (bank === 'MANDIRI') {
                bankSpecific = [
                    { key: 'mobileUser', label: 'User Livin' },
                    { key: 'mobilePassword', label: 'Password Livin' },
                    { key: 'mobilePin', label: 'PIN Livin' },
                    { key: 'ibUser', label: 'User IB' },
                    { key: 'ibPassword', label: 'Pass IB' },
                    { key: 'ibPin', label: 'PIN IB' }
                ];
            } else if (bank === 'OCBC' || bank === 'OCBC NISP') {
                bankSpecific = [
                    { key: 'ocbcNyalaUser', label: 'User Nyala' },
                    { key: 'mobilePassword', label: 'Password Nyala' },
                    { key: 'mobilePin', label: 'PIN Nyala' },
                    { key: 'ibUser', label: 'User IB' },
                    { key: 'ibPassword', label: 'Pass IB' },
                    { key: 'ibPin', label: 'PIN IB' }
                ];
            } else {
                bankSpecific = [
                    { key: 'mobileUser', label: 'User Mobile' },
                    { key: 'mobilePassword', label: 'Password Mobile' },
                    { key: 'mobilePin', label: 'PIN Mobile' },
                    { key: 'ibUser', label: 'User IB' },
                    { key: 'ibPassword', label: 'Pass IB' },
                    { key: 'ibPin', label: 'PIN IB' }
                ];
            }

            const currentFields = [...commonStart, ...bankSpecific, ...commonEnd];
            const imageParagraphs = [];

            await addImageToParagraphs(imageParagraphs, p.uploadFotoId, 'FOTO KTP');
            await addImageToParagraphs(imageParagraphs, p.uploadFotoSelfie, 'FOTO SELFIE');

            return {
                properties: { type: idx === 0 ? undefined : SectionType.NEXT_PAGE },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `HASIL KOREKSI DATA - PRODUK ${idx + 1}`,
                                bold: true,
                                size: 28,
                                color: '2E75B6'
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                    ...currentFields.map(field => {
                        let val = p[field.key];
                        // Render empty strings if value is missing/dash so Word document doesn't default to "-"
                        if (val === undefined || val === null || val === '-') {
                            val = '';
                        }
                        const sanitizedVal = sanitizeText(val);
                        return new Paragraph({
                            children: [
                                new TextRun({ text: `${field.label}: `, bold: true, size: 22 }),
                                new TextRun({ text: sanitizedVal, size: 22 }),
                            ],
                            spacing: { after: 120 },
                        });
                    }),
                    ...imageParagraphs,
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Catatan: Dokumen ini telah distandardisasi oleh sistem.",
                                size: 16,
                                italic: true,
                                color: '808080'
                            })
                        ],
                        spacing: { before: 400 },
                    }),
                ]
            };
        }));

        const doc = new Document({ sections: sections });
        const buffer = await Packer.toBuffer(doc);
        return { success: true, buffer, filename: `corrected-list-${Date.now()}.docx` };

    } catch (error) {
        logger.error('Failed to generate Corrected Word List', { error: error.message });
        return { success: false, error: error.message };
    }
};

module.exports = {
    generateWordTemplate,
    generateBankSpecificTemplate,
    generateCorrectedWord,
    generateCorrectedWordList
};

