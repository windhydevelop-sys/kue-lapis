const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require(path.join(__dirname, '..', 'models', 'User'));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/website_aksesoris', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');

    const email = 'admin@example.com';
    const username = 'TOTO';
    const password = '66778899';

    let user = await User.findOne({ email });
    if (user) {
      console.log('Admin user already exists, updating credentials');
      user.username = username;
      user.password = password; // pre-save middleware will hash
      await user.save();
      console.log('✅  Admin credentials updated!');
      process.exit(0);
    }

    // Create new admin
    const adminUser = new User({
      username,
      email,
      password, // plain, will be hashed by pre-save
      role: 'admin',
    });

    await adminUser.save();

    console.log('✅  Admin user created successfully!');
    console.log('   Email   :', email);
    console.log('   Password:', password);
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }
})();