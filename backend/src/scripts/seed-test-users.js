/**
 * Seed Test Users Script
 * Creates test buyer and seller accounts for testing
 */

require('dotenv').config();
const { sequelize } = require('../models');
const User = require('../models/User');

async function seedTestUsers() {
  try {
    console.log('🌱 Starting test users seed...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Test Buyer
    const buyerEmail = 'buyer@test.com';
    let buyer = await User.findOne({ where: { email: buyerEmail } });

    if (!buyer) {
      const buyerPasswordHash = await User.hashPassword('Buyer123!');
      buyer = await User.create({
        email: buyerEmail,
        password_hash: buyerPasswordHash,
        first_name: 'Test',
        last_name: 'Buyer',
        role: 'buyer',
        email_verified: true,
      });
      console.log('✅ Test buyer created!');
      console.log(`   Email: ${buyer.email}`);
      console.log(`   Password: Buyer123!`);
    } else {
      console.log('⚠️ Test buyer already exists');
      console.log(`   Email: ${buyer.email}`);
    }

    // Test Seller
    const sellerEmail = 'seller@test.com';
    let seller = await User.findOne({ where: { email: sellerEmail } });

    if (!seller) {
      const sellerPasswordHash = await User.hashPassword('Seller123!');
      seller = await User.create({
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        first_name: 'Test',
        last_name: 'Seller',
        role: 'seller',
        email_verified: true,
      });
      console.log('✅ Test seller created!');
      console.log(`   Email: ${seller.email}`);
      console.log(`   Password: Seller123!`);
    } else {
      console.log('⚠️ Test seller already exists');
      console.log(`   Email: ${seller.email}`);
    }

    console.log('\n📋 Test Accounts Summary:');
    console.log('================================');
    console.log('Buyer Account:');
    console.log('  Email: buyer@test.com');
    console.log('  Password: Buyer123!');
    console.log('\nSeller Account:');
    console.log('  Email: seller@test.com');
    console.log('  Password: Seller123!');
    console.log('\nAdmin Account:');
    console.log('  Email: admin@dostanmarket.com');
    console.log('  Password: Admin@123456');
    console.log('================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test users:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedTestUsers();
