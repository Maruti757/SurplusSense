/**
 * Seed script to create the initial admin account.
 * Run once: node server/scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const AppSettings = require('../models/AppSettings');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodshare';

const ADMIN = {
  name: 'FoodShare Administrator',
  email: 'admin@foodshare.com',
  phone: '9999999999',
  password: 'Admin@FoodShare2024',
  organizationName: 'FoodShare HQ',
  organizationType: 'Admin',
  role: 'admin',
  isVerified: true,
  isApproved: true
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      console.log(`⚠️  Admin already exists: ${existing.email}`);
    } else {
      const admin = new User(ADMIN);
      await admin.save();
      console.log('✅ Admin account created!');
      console.log(`   Email:    ${ADMIN.email}`);
      console.log(`   Password: ${ADMIN.password}`);
      console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!');
    }

    // Ensure default AppSettings doc exists
    const settings = await AppSettings.findOne({ key: 'global' });
    if (!settings) {
      await AppSettings.create({ key: 'global' });
      console.log('✅ Default app settings created');
    } else {
      console.log('ℹ️  App settings already exist');
    }

    console.log('\n🎉 Seed complete! You can now login at /login with the Admin tab.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
