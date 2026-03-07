const { parseTableData } = require('./utils/pdfParser');

const testTable = [
    ['No', 'Nama', 'NIK', 'No Rek', 'USER ID', 'PASSWORD', 'PIN'],
    ['1', 'Azhi Suhendar', '3201010508870007', '1550015510582', 'azhisuhendar', 'Dwiyans145', '145145']
];

console.log('Test Case 1: Standard Table');
let products = parseTableData(testTable);
console.log('Result:', JSON.stringify(products[0], null, 2));

const testTable2 = [
    ['ID', 'Label', 'Value'],
    ['1', 'User ID', 'azhisuhendar'],
    ['2', 'Password', 'Dwiyans145']
];
console.log('\nTest Case 2: Grid/List-like Table (not supported by parseTableData)');
// parseTableData treats each row as a product.
// In Case 2, it would think there are two products with 'mobileUser' set to 'User ID' and 'Password' respectively.
// This is why Case 2 should fail parseTableData and fall back to parseProductData.

const { parseProductData } = require('./utils/pdfParser');
const gridText = `USER ID: azhisuhendar
Password: Dwiyans145
PIN: 145145`;
console.log('\nTest Case 3: Grid Text Extraction');
const products3 = parseProductData(gridText);
console.log('Result:', JSON.stringify(products3[0], null, 2));

const testTable4 = [
    ['Order', 'Customer', 'User', 'Pass', 'Pin', 'Bank'],
    ['123', 'Azhi', 'azhi123', 'pass123', '112233', 'MANDIRI']
];
console.log('\nTest Case 4: Minimal Headers');
const products4 = parseTableData(testTable4);
console.log('Result:', JSON.stringify(products4[0], null, 2));

const testTable5 = [
    ['Nama:', 'NIK:', 'No Rek:', 'User ID:', 'Password:'],
    ['Azhi Suhendar', '3201010508870007', '1550015510582', 'azhisuhendar', 'Dwiyans145']
];
console.log('\nTest Case 5: Headers with Colons (Mandiri)');
const products5 = parseTableData(testTable5);
console.log('Result:', JSON.stringify(products5[0], null, 2));

const testTable6 = [
    ['Nama', 'NIK', 'No Rek', 'Pass Livin', 'Pin Livin'],
    ['Azhi Suhendar', '3201010508870007', '1550015510582', 'Dwiyans145', '145145']
];
console.log('\nTest Case 6: Shorthand Headers (Mandiri - Pass Livin)');
const products6 = parseTableData(testTable6);
console.log('Result:', JSON.stringify(products6[0], null, 2));

const testTable7 = [
    ['Nama', 'NIK', 'No Rek', 'Mobile Pass', 'Mobile Pin Livin'],
    ['Azhi Suhendar', '3201010508870007', '1550015510582', 'Dwiyans145', '145145']
];
console.log('\nTest Case 7: Extended Shorthand Headers (Mandiri - Mobile Pass/Pin Livin)');
const products7 = parseTableData(testTable7);
console.log('Result:', JSON.stringify(products7[0], null, 2));

const testTable8 = [
    ['Nama', 'NIK', 'No Rek', 'Password Mobile', 'Pin Mobile'],
    ['Azhi Suhendar', '3201010508870007', '1550015510582', 'Dwiyans145', '145145']
];
console.log('\nTest Case 8: Extended Shorthand Headers (Mandiri - Password Mobile/Pin Mobile)');
const products8 = parseTableData(testTable8);
console.log('Result:', JSON.stringify(products8[0], null, 2));
