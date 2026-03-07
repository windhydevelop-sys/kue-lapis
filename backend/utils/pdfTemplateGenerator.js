const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { logger } = require('./audit');

/**
 * Determine if a field should be displayed based on bank and jenisRekening.
 * Mirrors the logic in ProductDetail.js (frontend).
 */
const shouldDisplayField = (key, product) => {
    const bank = (product.bank || '').toUpperCase();
    const jenisRekening = (product.jenisRekening || '').toUpperCase();

    // BCA-exclusive fields
    if (['pinMBca', 'kodeAkses', 'myBCAUser', 'myBCAPassword', 'myBCAPin', 'pinKeyBCA'].includes(key)) {
        return bank.includes('BCA');
    }

    // pinWondr / passWondr — only relevant for BNI (Wondr app)
    if (['pinWondr', 'passWondr'].includes(key)) {
        return bank.includes('BNI');
    }

    // mobileUser, mobilePassword, mobilePin — used by non-BCA, non-BRI banks
    // BRI uses dedicated brimoUser/brimoPassword/brimoPin instead
    if (['mobileUser', 'mobilePassword', 'mobilePin'].includes(key)) {
        return !bank.includes('BCA') && !bank.includes('BRI');
    }

    // IB fields — show for all banks except BRI
    if (['ibUser', 'ibPassword', 'ibPin'].includes(key)) {
        return !bank.includes('BRI');
    }

    // BRI BRImo-specific fields (only for BRI non-QRIS)
    if (['brimoUser', 'brimoPassword', 'brimoPin'].includes(key)) {
        return bank.includes('BRI') && !jenisRekening.includes('QRIS');
    }

    // BRI MERCHANT QRIS fields
    if (['briMerchantUser', 'briMerchantPassword'].includes(key)) {
        return bank.includes('BRI') && jenisRekening.includes('QRIS');
    }

    // OCBC Nyala fields
    if (['ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'].includes(key)) {
        return bank.includes('OCBC') || bank.includes('NISP');
    }

    // Deprecated generic merchant fields
    if (['merchantUser', 'merchantPassword'].includes(key)) {
        return false;
    }

    return true;
};

/**
 * Get dynamic label for a field based on the bank type.
 * Mirrors the logic in ProductDetail.js (frontend).
 */
const getDynamicLabel = (key, product, defaultLabel) => {
    const bank = (product.bank || '').toUpperCase();

    if (key === 'mobileUser') {
        if (bank.includes('BNI')) return 'User Wondr';
        if (bank.includes('MANDIRI')) return 'User Livin';
        if (bank.includes('BRI')) return 'User Brimo';
        if (bank.includes('OCBC') || bank.includes('NISP')) return 'User Nyala';
    }

    if (key === 'mobilePassword') {
        if (bank.includes('BCA')) return 'Kode Akses M-BCA';
        if (bank.includes('BNI')) return 'Password Wondr';
        if (bank.includes('MANDIRI')) return 'Password Livin';
        if (bank.includes('BRI')) return 'Password Brimo';
    }

    if (key === 'mobilePin') {
        if (bank.includes('BNI')) return 'Pin Wondr';
        if (bank.includes('MANDIRI')) return 'Pin Livin';
        if (bank.includes('BRI')) return 'Pin Brimo';
    }

    if (key === 'ibUser') {
        if (bank.includes('BCA')) return 'User Internet Banking';
    }

    if (key === 'ibPin') {
        if (bank.includes('BCA')) return 'Pin Internet Banking';
    }

    return defaultLabel;
};

/**
 * Normalize product data for export — ensures BRI-specific fields are
 * populated from generic fields (and vice versa) so the PDF never shows
 * blanks when the data actually exists in an alternative field.
 */
const normalizeProductForExport = (product) => {
    const p = { ...product };
    const bank = (p.bank || '').toUpperCase();
    const jenisRekening = (p.jenisRekening || '').toUpperCase();

    const hasValue = (v) => v && v !== '-' && v !== '';

    if (bank.includes('BRI')) {
        if (jenisRekening.includes('QRIS')) {
            // QRIS: merge generic merchant → BRI merchant
            if (!hasValue(p.briMerchantUser) && hasValue(p.merchantUser)) p.briMerchantUser = p.merchantUser;
            if (!hasValue(p.briMerchantPassword) && hasValue(p.merchantPassword)) p.briMerchantPassword = p.merchantPassword;
        } else {
            // Tabungan: merge generic mobile ↔ brimo (bidirectional)
            if (!hasValue(p.brimoUser) && hasValue(p.mobileUser)) p.brimoUser = p.mobileUser;
            if (!hasValue(p.brimoPassword) && hasValue(p.mobilePassword)) p.brimoPassword = p.mobilePassword;
            if (!hasValue(p.brimoPin) && hasValue(p.mobilePin)) p.brimoPin = p.mobilePin;
            // Reverse: if brimo is set but mobile is not, copy back
            if (!hasValue(p.mobileUser) && hasValue(p.brimoUser)) p.mobileUser = p.brimoUser;
            if (!hasValue(p.mobilePassword) && hasValue(p.brimoPassword)) p.mobilePassword = p.brimoPassword;
            if (!hasValue(p.mobilePin) && hasValue(p.brimoPin)) p.mobilePin = p.brimoPin;
        }
    }

    return p;
};

/**
 * Generate PDF from corrected/extracted product data
 * @param {Array} products Array of product objects
 * @param {String} format 'table' or 'list'
 */
const generateCorrectedPDF = async (products, format = 'table') => {
    let browser;
    try {
        // Normalize all products before rendering
        const normalizedProducts = products.map(normalizeProductForExport);
        logger.info('Generating Corrected PDF document', { count: normalizedProducts.length, format });

        // Complete field list with all bank-specific fields
        const fields = [
            // Data Order
            { key: 'noOrder', label: 'No. Order' },
            { key: 'codeAgen', label: 'Code Agen' },
            { key: 'customer', label: 'Customer' },
            // Data Bank
            { key: 'bank', label: 'Bank' },
            { key: 'jenisRekening', label: 'Jenis Rekening' },
            { key: 'grade', label: 'Grade' },
            { key: 'kcp', label: 'Kantor Cabang' },
            // Data Personal
            { key: 'nik', label: 'NIK' },
            { key: 'nama', label: 'Nama' },
            { key: 'namaIbuKandung', label: 'Nama Ibu Kandung' },
            { key: 'tempatTanggalLahir', label: 'Tempat/Tanggal Lahir' },
            { key: 'noRek', label: 'No. Rekening' },
            { key: 'sisaSaldo', label: 'Sisa Saldo' },
            { key: 'noAtm', label: 'No. ATM' },
            { key: 'validThru', label: 'Valid Kartu' },
            { key: 'noHp', label: 'No. HP' },
            // Data Keamanan - Umum
            { key: 'pinAtm', label: 'PIN ATM' },
            { key: 'pinWondr', label: 'PIN Wondr' },
            { key: 'passWondr', label: 'Pass Wondr' },
            { key: 'email', label: 'Email' },
            { key: 'passEmail', label: 'Password Email' },
            // Mobile Banking (non-BCA)
            { key: 'mobileUser', label: 'User Mobile' },
            { key: 'mobilePassword', label: 'Password Mobile' },
            { key: 'mobilePin', label: 'PIN Mobile' },
            // Internet Banking
            { key: 'ibUser', label: 'User I-Banking' },
            { key: 'ibPassword', label: 'Password IB' },
            { key: 'ibPin', label: 'PIN IB' },
            // BCA-specific
            { key: 'myBCAUser', label: 'BCA-ID' },
            { key: 'myBCAPassword', label: 'Pass BCA-ID' },
            { key: 'myBCAPin', label: 'Pin Transaksi' },
            { key: 'pinKeyBCA', label: 'Pin KeyBCA' },
            { key: 'kodeAkses', label: 'Kode Akses M-BCA' },
            { key: 'pinMBca', label: 'Pin M-BCA' },
            // BRI-specific
            { key: 'brimoUser', label: 'User Brimo' },
            { key: 'brimoPassword', label: 'Password Brimo' },
            { key: 'brimoPin', label: 'Pin Brimo' },
            { key: 'briMerchantUser', label: 'User Merchant QRIS' },
            { key: 'briMerchantPassword', label: 'Password Merchant QRIS' },
            // OCBC-specific
            { key: 'ocbcNyalaUser', label: 'User Nyala' },
            { key: 'ocbcNyalaPassword', label: 'Password Nyala' },
            { key: 'ocbcNyalaPin', label: 'Pin Nyala' },
            // Data Tambahan
            { key: 'expired', label: 'Expired' },
            { key: 'status', label: 'Status' },
            { key: 'complaint', label: 'Complaint' }
        ];

        // First 10 fields are universal (used for table format)
        const tableFields = fields.slice(0, 10);

        // Helper to resolve image path for Puppeteer
        const buildImageSrc = (src) => {
            if (!src || src === '-' || src === '') return null;

            // Always try to find locally first by filename, even if it's a URL
            const filename = path.basename(src.split('?')[0]);
            const localPath = path.join(__dirname, '../uploads', filename);
            if (fs.existsSync(localPath)) return `file://${localPath}`;

            const rootPath = path.join(__dirname, '../../uploads', filename);
            if (fs.existsSync(rootPath)) return `file://${rootPath}`;

            // If not found locally, and it's a URL, return the URL
            if (src.toString().startsWith('http')) return src;

            return null;
        };

        // Helper to format field value
        const formatValue = (key, value) => {
            if (value === undefined || value === null || value === '') return '-';
            if (key === 'expired' && value) {
                try {
                    return new Date(value).toLocaleDateString('id-ID');
                } catch (e) {
                    return value;
                }
            }
            return String(value);
        };

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #333; }
                h1 { text-align: center; color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
                .footer { text-align: center; font-size: 10px; color: #777; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
                
                /* Table Styles */
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; table-layout: fixed; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                th { background-color: #f8f9fa; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                
                /* List Styles */
                .product-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 30px; page-break-after: always; }
                .product-card:last-child { page-break-after: auto; }
                .product-header { background-color: #007bff; color: white; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-weight: bold; }
                .field-row { display: flex; border-bottom: 1px solid #eee; padding: 8px 0; }
                .field-label { width: 200px; font-weight: bold; color: #555; }
                .field-value { flex: 1; }

                /* Image Gallery */
                .image-section { margin-top: 30px; }
                .image-title { font-weight: bold; color: #007bff; border-left: 4px solid #007bff; padding-left: 10px; margin: 20px 0 10px 0; }
                .image-container { display: flex; gap: 20px; flex-wrap: wrap; }
                .image-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fff; }
                .image-box img { max-width: 400px; max-height: 300px; object-fit: contain; display: block; }
                .image-label { text-align: center; font-weight: bold; margin-top: 5px; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>Laporan Data Produk Lengkap</h1>
            <div style="text-align: right; font-size: 12px; margin-bottom: 20px;">
                Dibuat pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}
            </div>
        `;

        if (format === 'table') {
            html += `
            <table>
                <thead>
                    <tr>
                        <th style="width: 30px">No</th>
                        ${tableFields.map(f => `<th>${f.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${normalizedProducts.map((p, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            ${tableFields.map(f => `<td>${formatValue(f.key, p[f.key])}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <p style="font-size: 12px; margin-top: 20px;">* Tabel di atas hanya menampilkan 10 kolom utama. Gunakan format List untuk detail lengkap per produk.</p>
            
            <div class="image-section">
                ${normalizedProducts.map((p, idx) => {
                const ktpSrc = buildImageSrc(p.uploadFotoId);
                const selfieSrc = buildImageSrc(p.uploadFotoSelfie);

                if (!ktpSrc && !selfieSrc) return '';

                return `
                        <div class="image-title">LAMPIRAN FOTO - PRODUK ${idx + 1} (${p.nama || '-'})</div>
                        <div class="image-container">
                            ${ktpSrc ? `
                                <div class="image-box">
                                    <img src="${ktpSrc}" alt="KTP">
                                    <div class="image-label">FOTO KTP</div>
                                </div>
                            ` : ''}
                            ${selfieSrc ? `
                                <div class="image-box">
                                    <img src="${selfieSrc}" alt="Selfie">
                                    <div class="image-label">FOTO SELFIE</div>
                                </div>
                            ` : ''}
                        </div>
                    `;
            }).join('')}
            </div>
            `;
        } else {
            // List format — bank-aware rendering per product
            html += normalizedProducts.map((p, idx) => {
                const ktpSrc = buildImageSrc(p.uploadFotoId);
                const selfieSrc = buildImageSrc(p.uploadFotoSelfie);

                // Filter fields based on bank and render with dynamic labels
                const fieldRows = fields
                    .filter(f => shouldDisplayField(f.key, p))
                    .map(f => {
                        const value = formatValue(f.key, p[f.key]);
                        // Skip fields with empty/dash values to keep the card clean
                        if (value === '-') return '';
                        const label = getDynamicLabel(f.key, p, f.label);
                        return `
                        <div class="field-row">
                            <div class="field-label">${label}</div>
                            <div class="field-value">${value}</div>
                        </div>
                    `;
                    })
                    .filter(row => row !== '')
                    .join('');

                return `
                <div class="product-card">
                    <div class="product-header">PRODUK ${idx + 1} - ${p.nama || 'Tanpa Nama'} (${p.bank || '-'})</div>
                    ${fieldRows}
                    
                    ${(ktpSrc || selfieSrc) ? `
                        <div class="image-section">
                            <div class="image-title">LAMPIRAN FOTO</div>
                            <div class="image-container">
                                ${ktpSrc ? `
                                    <div class="image-box">
                                        <img src="${ktpSrc}" alt="KTP">
                                        <div class="image-label">FOTO KTP</div>
                                    </div>
                                ` : ''}
                                ${selfieSrc ? `
                                    <div class="image-box">
                                        <img src="${selfieSrc}" alt="Selfie">
                                        <div class="image-label">FOTO SELFIE</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            }).join('');
        }

        html += `
            <div style="margin-top: 50px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
                <div style="width: 250px; text-align: center;">
                    <div style="font-size: 12px; margin-bottom: 60px;">Dicetak oleh Administrator,</div>
                    <div style="border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
                    <div style="font-size: 12px; font-weight: bold;">( _____________________ )</div>
                    <div style="font-size: 10px; color: #666;">Tanda Tangan & Nama Terang</div>
                </div>
            </div>

            <div class="footer">
                <p>© ${new Date().getFullYear()} Website Aksesoris - Laporan Sistem Keamanan</p>
                <p>Dokumen ini dihasilkan secara otomatis oleh sistem pada ${new Date().toLocaleString('id-ID')}</p>
            </div>
        </body>
        </html>
        `;

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: format === 'table',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();
        return {
            success: true,
            buffer: pdfBuffer,
            filename: `corrected-data-${Date.now()}.pdf`
        };

    } catch (error) {
        if (browser) await browser.close();
        logger.error('Failed to generate Corrected PDF', { error: error.message });
        return { success: false, error: error.message };
    }
};

module.exports = {
    generateCorrectedPDF
};
