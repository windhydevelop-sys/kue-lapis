
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

const envPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../.env.development')
    : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const connectDB = require('../config/db');
const Product = require('../models/Product');

const checkBRIData = async () => {
    try {
        await connectDB();

        // Find a BRI product
        const briProduct = await Product.findOne({ bank: /BRI/i }).sort({ createdAt: -1 });

        if (!briProduct) {
            console.log('No BRI product found');
            return;
        }

        const decrypted = briProduct.getDecryptedData ? briProduct.getDecryptedData() : briProduct.toObject();

        console.log('--- Last BRI Product Data (Decrypted) ---');
        console.log('ID:', briProduct._id);
        console.log('Nama:', decrypted.nama);
        console.log('Tempat/Tgl Lahir:', decrypted.tempatTanggalLahir);
        console.log('BRImo User:', decrypted.brimoUser);
        console.log('BRImo Pass:', decrypted.brimoPassword);
        console.log('BRImo Pin:', decrypted.brimoPin);
        console.log('Mobile User:', decrypted.mobileUser);
        console.log('Mobile Pass:', decrypted.mobilePassword);
        console.log('Mobile Pin:', decrypted.mobilePin);
        console.log('Raw Doc Keys:', Object.keys(briProduct._doc));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
};

checkBRIData();
