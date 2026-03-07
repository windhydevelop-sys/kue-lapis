const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env
const envPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../.env.development')
    : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const connectDB = require('../config/db');
const Product = require('../models/Product');

const createTestProduct = async () => {
    try {
        await connectDB();

        const today = new Date();
        const testDate = new Date();
        testDate.setDate(today.getDate() + 5); // Expired in 5 days

        const testProduct = new Product({
            noOrder: 'TEST-' + Math.floor(Math.random() * 10000),
            nama: 'Produk Uji Coba Telegram',
            bank: 'BCA',
            expired: testDate,
            status: 'pending'
        });

        await testProduct.save();
        console.log(`✅ Produk Test Berhasil Dibuat!`);
        console.log(`- Nama: ${testProduct.nama}`);
        console.log(`- No Order: ${testProduct.noOrder}`);
        console.log(`- Tanggal Expired: ${testProduct.expired.toDateString()}`);
        console.log(`\nSilakan jalankan: node backend/scripts/checkExpiredProducts.js`);

    } catch (error) {
        console.error('Error creating test product:', error);
    } finally {
        mongoose.connection.close();
    }
};

createTestProduct();
