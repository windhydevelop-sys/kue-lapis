/**
 * Normalization helpers for consistent data formats 
 * across the application.
 */

/**
 * Normalizes Order Numbers to be uppercase and trimmed.
 * @param {string} str - The raw order number.
 * @returns {string} - The normalized order number.
 */
const normalizeNoOrder = (str) => {
    if (!str) return '';
    // Normalize by Removing: ( ) [ ] - : and Uppercase
    return String(str).trim().replace(/[()\[\]\-:]/g, '').toUpperCase();
};

/**
 * Normalizes Customer Codes/Names by removing specific symbols 
 * and converting to uppercase.
 * Symbols removed: : - < > ) (
 * @param {string} str - The raw customer code/name.
 * @returns {string} - The normalized customer code.
 */
const normalizeCustomer = (str) => {
    if (!str) return '';
    // Ignore/Remove: : - < > ) (
    return String(str).trim().replace(/[:\-<>\)\(]/g, '').toUpperCase();
};

module.exports = {
    normalizeNoOrder,
    normalizeCustomer
};
