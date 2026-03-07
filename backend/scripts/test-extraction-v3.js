const patterns = {
    nik: /NIK[\s:]*([0-9\-\s]{16,25})/i,
    nama: /Nama[\s:]*([A-Za-z\s\.]+?)(?:\s+Ibu|\s+Tempat|\s+No\.|\n|$)/i,
    namaIbuKandung: /(?:Nama\s*)?Ibu\s*Kandung[\s:]*([A-Za-z\s]+?)(?:\s+Tempat|\s+No\.|\n|$)/i,
    noRek: /No.*?Rek(?:ening)?[\s:]*([0-9\s\-]{8,25})/i,
    noAtm: /(?:No\.?\s*ATM|Nomor\s*ATM|No\.?\s*Kartu\s*Debit)[\s:]*([0-9\s\-]{16,25})(?:\s*\(([^)]+?)\))?/i,
    validThru: /(?:Valid.*Thru|Valid.*Kartu)\s*[\s:]+\s*([0-9\/\-]+)/i,
    bank: /(?:^|\s)(?:Bank|Nama\s?Bank)[\s:]*([A-Za-z\s]+?)(?:\s*\((?:Grade\s+)?([^)]+?)\))?(?:\s+Grade|\s+KCP|\s+Kantor\s+Cabang|\n|$)/i,
    grade: /(?:^|\s)Grade[\s:]*([A-Za-z0-9\s]+?)(?:\s*\)|$|\s+KCP|\s+Kantor\s+Cabang|\s+NIK|\n)/i,
    kcp: /(?:KCP|Kantor\s+Cabang|Cabang\s+Bank)\s*[\s:]+\s*([A-Za-z0-9\s\-\.]+?)(?:\s+NIK|\n|$)/i,
};

const testCases = [
    {
        label: 'Bank + Grade Combined',
        text: 'bank : BNI (Grade B)',
        fields: ['bank', 'grade']
    },
    {
        label: 'No ATM + Valid Thru Combined',
        text: 'No atm : 8888999977776666 (07/30)',
        fields: ['noAtm', 'validThru']
    },
    {
        label: 'Cabang Bank Label',
        text: 'cabang bank : Kc pekalongan',
        fields: ['kcp']
    }
];

testCases.forEach(tc => {
    console.log(`\n=== Testing: ${tc.label} ===`);
    console.log(`Text: "${tc.text}"`);

    const extractedData = {};
    Object.keys(patterns).forEach(key => {
        const match = tc.text.match(patterns[key]);
        if (match && match[1]) {
            extractedData[key] = match[1].trim();
            if (key === 'bank' && match[2] && !extractedData.grade) {
                extractedData.grade = match[2].trim();
            }
            if (key === 'noAtm' && match[2] && !extractedData.validThru) {
                extractedData.validThru = match[2].trim();
            }
        }
    });
    console.log('Result:', JSON.stringify(extractedData, null, 2));
});
