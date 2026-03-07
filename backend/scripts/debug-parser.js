const logger = { info: console.log, warn: console.warn };

// Text from User Sample
const text = `
No.ORDER : FKKT0109

Code Agen  : GGE

Bank : BCA

Grade : B ( Garansi 10jt )

KCP : Gedong Panjang

NIK : 3172012606051005

Nama : Rendi Pirmansah

Ibu Kandung : Dewi Marwiyah

Tpat Tgl Lahir : Kuningan, 26 Juni 2005

No.Rek : 5830410165

No.ATM : 6019009517503289

Valid Thru : 04/30

No.HP : 085946804459

Pin ATM : 145145

Kode Akses : dwiy14

Pin M-BCA :145145

User I-Banking : RENDIPIR2605

Pin I-Banking : 145145

BCA-ID : RENDISLOW08

Pass BCA-ID : Dwiyans145

Pin Transaksi : 145145

Email: tokokelontong7@gmail.com

Pass Email : @dwiyans145

Expired Garansi: Oktober 2026
`;

const parseProductData = (text) => {
    const products = [];

    // Split text into blocks by "No.ORDER" (support multi-product per file)
    const productBlocks = text.split(/(?=No\s*\.?\s*ORDER)/i).filter(block => block.trim().length > 20);

    console.log('Detected blocks:', productBlocks.length);

    productBlocks.forEach((blockText, index) => {
        // Patterns adjusted for user's specific format
        const patterns = {
            nik: /(?:^|\n)\s*NIK[\s:]*([0-9]{16})(?:\s|$|\n)/i,
            nama: /(?:^|\n)\s*Nama[\s:]*([A-Za-z\s\.]+?)(?:\n|$)/i,
            namaIbuKandung: /(?:^|\n)\s*(?:Nama\s*)?Ibu\s*Kandung[\s:]*([A-Za-z\s]+?)(?:\n|$)/i,
            tempatTanggalLahir: /(?:^|\n)\s*(?:Tempat|Tpat)?.*(?:Tanggal|Tgl)?.*Lahir[\s:]*([A-Za-z\s,0-9]+?)(?:\n|$)/i,
            noRek: /(?:^|\n)\s*No.*Rek(?:ening)?[\s:]*([0-9]{8,18})(?:\s|$|\n)/i,
            noAtm: /(?:^|\n)\s*No.*ATM[\s:]*([0-9]{16})(?:\s|$|\n)/i,
            validThru: /(?:^|\n)\s*Valid.*Thru[\s:]*([0-9\/\-]+)(?:\s|$|\n)/i,
            noHp: /(?:^|\n)\s*No.*HP[\s:]*([0-9+\-\s]+?)(?:\n|$)/i,
            pinAtm: /(?:^|\n)\s*Pin.*ATM[\s:]*([0-9]{4,6})(?:\s|$|\n)/i,
            email: /(?:^|\n)\s*Email[\s:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s|$|\n)/i,
            bank: /(?:^|\n)\s*Bank[\s:]*([A-Za-z\s]+?)(?:\n|$)/i,
            grade: /(?:^|\n)\s*Grade[\s:]*([A-Za-z0-9\s\(\)]+?)(?:\n|$)/i,
            kcp: /(?:^|\n)\s*KCP[\s:]*([A-Za-z0-9\s\-]+?)(?:\n|$)/i,
            noOrder: /(?:^|\n)\s*No.*ORDER[\s:]*([A-Za-z0-9\-]+)(?:\s|$|\n)/i,
            codeAgen: /(?:^|\n)\s*Code.*Agen[\s:]*([A-Za-z0-9\-]+)(?:\s|$|\n)/i,
            expired: /(?:^|\n)\s*Expired.*(?:Garansi)?[\s:]*([A-Za-z0-9\s\-\/\,]+?)(?:\n|$)/i,

            // BNI Specific
            pinWondr: /(?:^|\n)\s*PIN.*Wondr[\s:]*([0-9]{4,6})(?:\s|$|\n)/i,
            passWondr: /(?:^|\n)\s*Pass(?:word)?.*Wondr[\s:]*([A-Za-z0-9!@#$%^&*]+?)(?:\n|$)/i,
            passEmail: /(?:^|\n)\s*Pass(?:word)?.*Email[\s:]*([A-Za-z0-9!@#$%^&*]+?)(?:\n|$)/i,

            // BCA Specific
            mobileUser: /(?:^|\n)\s*(?:Kode\s*Akses|User\s*Mobile|User\s*M-BCA)[\s:]*([A-Za-z0-9]+?)(?:\n|$)/i,
            mobilePin: /(?:^|\n)\s*(?:Pin\s*M-BCA|Pin\s*Mobile)[\s:]*([0-9]{4,6})(?:\s|$|\n)/i,
            ibUser: /(?:^|\n)\s*User\s*I-Banking[\s:]*([A-Za-z0-9]+?)(?:\n|$)/i,
            ibPassword: /(?:^|\n)\s*(?:Pin|Password)\s*I-Banking[\s:]*([A-Za-z0-9]+?)(?:\n|$)/i,
            myBCAUser: /(?:^|\n)\s*BCA-ID[\s:]*([A-Za-z0-9]+?)(?:\n|$)/i,
            myBCAPassword: /(?:^|\n)\s*Pass\s*BCA-ID[\s:]*([A-Za-z0-9!@#$%^&*]+?)(?:\n|$)/i,
            myBCAPin: /(?:^|\n)\s*Pin\s*Transaksi[\s:]*([0-9]{4,6})(?:\s|$|\n)/i
        };

        const extractedData = {};

        // Apply patterns
        Object.keys(patterns).forEach(key => {
            const match = blockText.match(patterns[key]);
            console.log(`Matching ${key}:`, match ? match[1] : 'FAIL'); // Debug log
            if (match && match[1]) {
                extractedData[key] = match[1].trim();
            }
        });

        products.push(extractedData);
    });

    return products;
};

const result = parseProductData(text);
console.log('Final Result:', JSON.stringify(result, null, 2));
