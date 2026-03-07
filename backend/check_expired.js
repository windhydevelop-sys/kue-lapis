const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Product = require('../backend/models/Product');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        const products = await Product.find({ expired: { $exists: true, $ne: null } });
        console.log(`Total products with 'expired' field: ${products.length}`);

        products.forEach(p => {
            const exp = new Date(p.expired);
            const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
            console.log(`- Order: ${p.noOrder || 'N/A'}, Nama: ${p.nama || 'N/A'}, Expired: ${p.expired.toISOString().split('T')[0]}, Diff: ${diffDays.toFixed(1)} days, Status: ${p.status}`);
        });

        const dashboardAlerts = products.filter(p => {
            const exp = new Date(p.expired);
            const diff = (exp - now) / (1000 * 60 * 60 * 24);
            return diff <= 7 && diff > 0;
        });
        console.log(`\nProducts that should show in Dashboard (7-day window): ${dashboardAlerts.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

check();
