const pdfParser = require('./backend/utils/pdfParser');
const { parseListFormat } = require('./backend/utils/documentParser');

// Simulate exact data from document
const testText = `No.ORDER : FYONGSGO112
Code Agen : GGE
Bank  :   BCA 
Grade   : B
KCP  :  Season City
NIK          : 3173-0407-0190-0009
Nama  : Yesi Mustofa Muli
Ibu Kandung : Soleha
Tempat Tgl Lahir : Jakarta, 07-01-1990
No.Rek  : 5370-571-416
No.ATM  : 6019-0095-1534-9949
Valid Thru : 02/30
No.HP  : 0859-2751-1380
Pin ATM  : 145145
Kode Akses : dwiy14
Pin M-BCA : 145145
User I-Banking : YESIMUSTO790
Pin I-Banking  : 145145
BCA-ID  : YESIMUSTHOFA47
Pass BCA-ID : Dwiyans145
Pin Transaksi : 145145
Email  : yulimusthofa0@gmail.com
Pass Email : @Dwiyans145 `;

const rows = parseListFormat(testText);
console.log('Rows from parseListFormat:', rows.length, 'rows');
console.log('Header row length:', rows[0].length);
console.log('Data row length:', rows[1].length);

// Find index of "Valid Kartu" in header
const validKartuIdx = rows[0].indexOf('Valid Kartu');
console.log('\nValid Kartu found at index:', validKartuIdx);
console.log('Header row[' + validKartuIdx + ']:', rows[0][validKartuIdx]);
console.log('Data row[' + validKartuIdx + ']:', rows[1][validKartuIdx]);

// Instead, test parseProductData with the text
console.log('\n========= Testing parseProductData with raw text =========');
const products = pdfParser.parseProductData(testText, 'BCA');
console.log('\nAfter parseProductData:');
console.log('Product found:', products.length);
if (products.length > 0) {
  console.log('validThru:', products[0].validThru);
  console.log('passEmail:', products[0].passEmail);
  console.log('kodeAkses:', products[0].kodeAkses);
}
