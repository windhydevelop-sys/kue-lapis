const logger = { info: console.log, warn: console.warn };

// EXACT Text from User
const rawText = `No.ORDER : FKKTHUNG0109 Code Agen : GGE Customer : FKKT Bank : BCA Grade : B ( Garansi 10jt ) KCP : Khm Mansyur II NIK : 3173-0414-0900-1003 Nama : Ricky Ardi Suwanto Ibu Kandung : Kastini Tempat Tgl Lahir : Jakarta, 14-09-2000 No.Rek : 5860-573-336 No.ATM : 6019-0095-1451-7967 Valid Thru : 07/29 No.HP : 0877-9841-2734 Pin ATM : 145145 Kode Akses : dwiy14 Pin M-BCA : 145145 User I-Banking : Pin I-Banking : 145145 BCA-ID : RICKYARD0109 Pass BCA-ID : Dwiyans145 Pin Transaks...`;

const parseProductData = (rawText) => {
    const products = [];

    // Normalization Logic from pdfParser.js
    let text = rawText
        .replace(/[\u2013\u2014\u2212]/g, '-')
        .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
        .replace(/[“”‘’]/g, "'");

    const productBlocks = text.split(/(?=No\s*\.?\s*ORDER)/i).filter(block => block && block.length > 20);

    productBlocks.forEach((blockText, index) => {
        // Exact Regex from pdfParser.js (Step 449)
        const patterns = {
            nik: /NIK[\s:]*([0-9\-\s]{16,25})/i,
            nama: /Nama[\s:]*([A-Za-z\s\.]+?)(?:\s+Ibu|\s+Tempat|\s+No\.|\n|$)/i,
            namaIbuKandung: /(?:Nama\s*)?Ibu\s*Kandung[\s:]*([A-Za-z\s]+?)(?:\s+Tempat|\s+No\.|\n|$)/i,
            // Fixed regex typo in Tempat (Tempat ... Lahir) - in parser step 449 regex was flexible
            tempatTanggalLahir: /(?:Tempat|Tpat)?.*(?:Tanggal|Tgl)?.*Lahir[\s:]*([A-Za-z\s,0-9\-]+?)(?:\s+No\.|\n|$)/i,

            noRek: /No.*?Rek(?:ening)?[\s:]*([0-9\s\-]{8,25})/i,
            noAtm: /No.*ATM[\s:]*([0-9\s\-]{16,25})/i,
            validThru: /Valid.*Thru[\s:]*([0-9\/\-]+)/i,
        };

        const extractedData = {};

        Object.keys(patterns).forEach(key => {
            const match = blockText.match(patterns[key]);
            console.log(`Matching ${key}:`, match ? `"${match[1]}"` : 'FAIL');
            if (match && match[1]) {
                extractedData[key] = match[1].trim();
            }
        });

        products.push(extractedData);
    });

    return products;
};

const result = parseProductData(rawText);
console.log('Result:', JSON.stringify(result, null, 2));
