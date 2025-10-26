/**
 * Seed Admin User Script
 * Creates an admin user in the database
 */

require('dotenv').config();
const { sequelize } = require('../models');
const User = require('../models/User');

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seed...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { email: 'admin@dostanmarket.com' },
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      process.exit(0);
    }

    // Create admin user with hashed password
    const passwordHash = await User.hashPassword('Admin@123456');
    const admin = await User.createAdmin({
      email: 'admin@dostanmarket.com',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'User',
    });

    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: Admin@123456`);
    console.log(`Role: ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
}

seedAdmin();
