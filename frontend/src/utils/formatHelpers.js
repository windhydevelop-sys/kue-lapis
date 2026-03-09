/**
 * Format a number or string as Indonesian currency (without Rp prefix)
 * using dot as thousand separator.
 * Example: 1000000 -> 1.000.000
 */
export const formatCurrency = (value) => {
    if (value === undefined || value === null || value === '') return '';

    // Remove all non-digits
    const cleaned = value.toString().replace(/\D/g, '');

    // Add dot every 3 digits from the right
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Remove dots from formatted currency string to get raw number
 * Example: 1.000.000 -> 1000000
 */
export const cleanCurrency = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;

    const cleaned = value.toString().replace(/\./g, '');
    return parseInt(cleaned, 10) || 0;
};
