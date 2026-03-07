const fieldMap = {
    'No. Order': 'noOrder', 'Code Agen': 'codeAgen', 'Customer': 'customer', 'Bank': 'bank',
    'Jenis Rekening': 'jenisRekening', 'Grade': 'grade', 'Kantor Cabang': 'kcp', 'NIK': 'nik', 'Nama': 'nama',
    'Nama Ibu Kandung': 'namaIbuKandung', 'Tempat/Tanggal Lahir': 'tempatTanggalLahir',
    'No. Rekening': 'noRek', 'Sisa Saldo': 'sisaSaldo', 'No. ATM': 'noAtm', 'Valid Kartu': 'validThru', 'No. HP': 'noHp',
    'PIN ATM': 'pinAtm', 'Email': 'email', 'Password Email': 'passEmail', 'Expired': 'expired',
    'User Mobile': 'mobileUser', 'Password Mobile': 'mobilePassword', 'PIN Mobile': 'mobilePin',
    'User IB': 'ibUser', 'Pass IB': 'ibPassword', 'PIN IB': 'ibPin',
    'User BRImo': 'brimoUser', 'Pass BRImo': 'brimoPassword', 'PIN BRImo': 'mobilePin',
    'User Wondr': 'mobileUser', 'Password Wondr': 'mobilePassword', 'PIN Wondr': 'mobilePin',
    'User Livin': 'mobileUser', 'Password Livin': 'mobilePassword', 'PIN Livin': 'mobilePin',
    'User Nyala': 'ocbcNyalaUser', 'Password Nyala': 'mobilePassword', 'PIN Nyala': 'mobilePin',
    'User': 'mobileUser', 'User ID': 'mobileUser', 'Username': 'mobileUser', 'ID User': 'mobileUser',
    'Password': 'mobilePassword', 'Sandi': 'mobilePassword', 'Pass': 'mobilePassword',
    'PIN': 'mobilePin', 'Pin': 'mobilePin'
};

const testHeaders = ['Nama', 'No. Rekening', 'User ID', 'Password', 'PIN'];
const testRow = ['Azhi Suhendar', '1550015510582', 'azhisuhendar', 'Dwiyans145', '145145'];

console.log('Testing Word Import FieldMap Mapping:');
const rowData = {};
testHeaders.forEach((header, idx) => {
    const key = fieldMap[header];
    if (key) {
        rowData[key] = testRow[idx];
        console.log(`  Matched header "${header}" to key "${key}" with value "${testRow[idx]}"`);
    } else {
        console.log(`  ❌ Header "${header}" did NOT match any field`);
    }
});

const { getMandatoryFields } = require('./config/bankFieldMapping');
const bank = 'MANDIRI';
const mandatory = getMandatoryFields(bank, 'TABUNGAN');
console.log(`\nMandatory fields for ${bank}: ${mandatory.join(', ')}`);

let hasError = false;
mandatory.forEach(f => {
    if (!rowData[f] || rowData[f] === '') {
        console.log(`  ❌ Missing mandatory field: ${f}`);
        hasError = true;
    } else {
        console.log(`  ✅ Mandatory field "${f}" is present`);
    }
});

if (!hasError) console.log('\nSUCCESS: All mandatory fields mapped correctly!');
else console.log('\nFAILURE: Some mandatory fields are missing.');
