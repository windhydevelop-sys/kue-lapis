const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env
const envPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../.env.development')
    : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const connectDB = require('../config/db');
const User = require('../models/User');

const usage = () => {
    console.log(`
Usage:
  node scripts/manageAdmin.js list
  node scripts/manageAdmin.js promote <email>
  node scripts/manageAdmin.js reset-password <email> <new-password>
    `);
};

const run = async () => {
    const args = process.argv.slice(2);
    const cmd = args[0];

    if (!cmd) {
        usage();
        process.exit(0);
    }

    try {
        await connectDB();

        if (cmd === 'list') {
            const users = await User.find({ role: 'admin' });
            console.log('--- ADMIN USERS ---');
            users.forEach(u => console.log(`- ${u.username} (${u.email}) [Active: ${u.isActive}]`));
        }
        else if (cmd === 'promote') {
            const email = args[1];
            if (!email) return console.log('Error: Email required');
            const user = await User.findOne({ email });
            if (!user) return console.log('Error: User not found');
            user.role = 'admin';
            user.isActive = true;
            await user.save();
            console.log(`✅ Success: ${user.username} is now an Admin.`);
        }
        else if (cmd === 'reset-password') {
            const email = args[1];
            const newPass = args[2];
            if (!email || !newPass) return console.log('Error: Email and New Password required');
            const user = await User.findOne({ email });
            if (!user) return console.log('Error: User not found');
            user.password = newPass; // Pre-save hooks handle hashing
            user.isActive = true;
            await user.save();
            console.log(`✅ Success: Password updated for ${user.username}.`);
        }
        else {
            usage();
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        mongoose.connection.close();
    }
};

run();
