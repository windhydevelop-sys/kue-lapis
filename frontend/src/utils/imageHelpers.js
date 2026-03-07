import axios from './axios';

/**
 * Builds a complete URL for an image based on the provided filename or public_id.
 * Handles full Cloudinary URLs, local upload paths, and legacy Cloudinary public_ids.
 * 
 * @param {string} filename - The filename, full URL, or public_id from the database
 * @returns {string} The complete URL for the image
 */
export const buildImageUrl = (filename) => {
    if (!filename) return '';

    // If it's already a full URL or a relative web path
    if (filename.startsWith('http') || filename.startsWith('/')) {
        return filename;
    }

    // No special handling for 'secure_' prefix because in this project 
    // it's used for local files extracted from Word/PDF documents.
    // New Cloudinary uploads store the full URL starting with 'http'.

    // Default to local uploads directory
    return `${axios.defaults.baseURL}/uploads/${filename}`;
};
