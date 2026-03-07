
const { getBankConfig, getMandatoryFields, getDisplayLabel } = require('./config/bankFieldMapping');

console.log('--- Testing Permata Bank Config ---');
const permataConfig = getBankConfig('013');
console.log('Detected Bank for "013":', permataConfig.name);
const permataMandatory = getMandatoryFields('PERMATA', 'TABUNGAN');
console.log('Mandatory fields for PERMATA:', permataMandatory);

const hasBrimo = permataMandatory.includes('brimoUser');
console.log('Is brimoUser required for PERMATA?', hasBrimo);

if (!hasBrimo) {
    console.log('SUCCESS: Permata no longer requires BRImo fields.');
} else {
    console.log('FAILURE: Permata still requires BRImo fields.');
}

console.log('\n--- Testing Generic Fallback ---');
const unknownConfig = getBankConfig('BANK GAIB');
console.log('Detected Bank for "BANK GAIB":', unknownConfig.name);
const genericMandatory = getMandatoryFields('BANK GAIB', 'TABUNGAN');
console.log('Mandatory fields for GENERIC:', genericMandatory);

if (unknownConfig.name === 'Generic Bank') {
    console.log('SUCCESS: Defaulted to Generic Bank.');
} else {
    console.log('FAILURE: Did not default to Generic Bank.');
}

console.log('\n--- Testing Display Labels for PERMATA ---');
console.log('mobileUser label:', getDisplayLabel('mobileUser', 'PERMATA'));
console.log('mobilePin label:', getDisplayLabel('mobilePin', 'PERMATA'));
