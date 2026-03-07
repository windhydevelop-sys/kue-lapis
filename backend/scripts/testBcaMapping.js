
const { matchHeaderToField } = require('../utils/pdfParser');

const testMapping = () => {
    const testCases = [
        { label: 'I-banking', expected: 'ibUser' },
        { label: 'i banking', expected: 'ibUser' },
        { label: 'ib', expected: 'ibUser' },
        { label: 'BCA-id', expected: 'myBCAUser' },
        { label: 'bca id', expected: 'myBCAUser' },
        { label: 'Pass BCA-id', expected: 'myBCAPassword' },
        { label: 'Pin Transaksi', expected: 'myBCAPin' }
    ];

    console.log('--- Testing BCA Label Mapping ---');
    let allPassed = true;

    testCases.forEach(tc => {
        const result = matchHeaderToField(tc.label);
        const passed = result === tc.expected;
        console.log(`Label: "${tc.label}" -> Expected: ${tc.expected}, Got: ${result} [${passed ? 'PASSED ✅' : 'FAILED ❌'}]`);
        if (!passed) allPassed = false;
    });

    console.log('\nOverall Result:', allPassed ? 'ALL PASSED ✅' : 'SOME FAILED ❌');
};

testMapping();
