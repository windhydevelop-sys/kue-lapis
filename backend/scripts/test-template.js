const { generateWordTemplate } = require('../utils/wordTemplateGenerator');

(async () => {
    try {
        console.log('Testing generateWordTemplate...');
        const result = await generateWordTemplate();
        if (result.success) {
            console.log('Success! Buffer length:', result.buffer.length);
        } else {
            console.error('Failed:', result.error);
        }
    } catch (err) {
        console.error('Crash:', err);
        console.error(err.stack);
    }
})();
