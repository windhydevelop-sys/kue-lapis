require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Adjust path if needed

async function createUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        let user = await User.findOne({ username: 'TOTO' });
        if (user) {
            console.log('User TOTO already exists');
            process.exit(0);
        }

        user = new User({
            username: 'TOTO',
            email: 'toto@example.com',
            password: 'new_password',
            role: 'admin',
            isActive: true,
            menuPermissions: {
                dashboard: true,
                inputProduct: true,
                customers: true,
                fieldStaff: true,
                complaints: true,
                handphone: true
            }
        });

        user.password = '66778899';
        await user.save();
        console.log('User TOTO added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createUser();
