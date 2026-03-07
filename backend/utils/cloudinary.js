const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'website-aksesoris', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }], // Limit size
        public_id: (req, file) => {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000000);
            return `secure_${timestamp}_${random}`;
        }
    }
});

// Multer upload middleware for Cloudinary
const uploadToCloudinary = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Upload a single file to Cloudinary (for programmatic uploads)
const uploadSingleFile = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'website-aksesoris',
            transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
        });
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Upload base64 image to Cloudinary
const uploadBase64Image = async (base64String, folder = 'website-aksesoris') => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder: folder,
            transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
        });
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary base64 upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'website-aksesoris',
                ...options
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary buffer upload error:', error);
                    return reject(error);
                }
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return { success: result.result === 'ok' };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    cloudinary,
    uploadToCloudinary,
    uploadSingleFile,
    uploadBase64Image,
    uploadBufferToCloudinary,
    deleteFromCloudinary
};
