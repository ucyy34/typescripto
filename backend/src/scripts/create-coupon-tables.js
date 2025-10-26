/**
 * Create Coupon Tables
 * Run this script to create coupons and coupon_usages tables
 */

const { sequelize } = require('../config/sequelize');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');

async function createCouponTables() {
  try {
    console.log('🎟️  Starting coupon tables creation...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Create tables
    await Coupon.sync({ force: false });
    console.log('✅ coupons table created successfully');

    await CouponUsage.sync({ force: false });
    console.log('✅ coupon_usages table created successfully');

    // Check coupons table structure
    const couponsInfo = await sequelize.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'coupons'
       ORDER BY ordinal_position;`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n📊 Coupons Table Structure:');
    console.table(couponsInfo);

    // Check coupon_usages table structure
    const usagesInfo = await sequelize.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'coupon_usages'
       ORDER BY ordinal_position;`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n📊 Coupon Usages Table Structure:');
    console.table(usagesInfo);

    // Create sample coupons for testing
    console.log('\n🎁 Creating sample coupons...');
    
    const sampleCoupons = [
      {
        code: 'WELCOME10',
        name: 'Welcome Discount',
        description: 'Get 10% off on your first order!',
        discount_type: 'percentage',
        discount_value: 10,
        max_discount_amount: 100,
        usage_limit: null, // Unlimited
        usage_limit_per_user: 1,
        first_order_only: true,
        min_order_amount: 50,
        is_active: true,
        notes: 'First order only coupon',
      },
      {
        code: 'SUMMER2024',
        name: 'Summer Sale',
        description: 'Summer special - 20% off on all products',
        discount_type: 'percentage',
        discount_value: 20,
        max_discount_amount: 500,
        usage_limit: 100,
        usage_limit_per_user: 1,
        min_order_amount: 200,
        is_active: true,
        notes: 'Summer campaign',
      },
      {
        code: 'FREESHIP',
        name: 'Free Shipping',
        description: 'Free shipping on orders over ₺150',
        discount_type: 'free_shipping',
        discount_value: 0,
        usage_limit: null,
        usage_limit_per_user: 5,
        min_order_amount: 150,
        is_active: true,
        notes: 'Free shipping promotion',
      },
      {
        code: 'SAVE50',
        name: 'Save ₺50',
        description: 'Get ₺50 off on orders over ₺300',
        discount_type: 'fixed',
        discount_value: 50,
        usage_limit: 50,
        usage_limit_per_user: 1,
        min_order_amount: 300,
        is_active: true,
        notes: 'Fixed amount discount',
      },
    ];

    for (const couponData of sampleCoupons) {
      const existing = await Coupon.findOne({ where: { code: couponData.code } });
      
      if (!existing) {
        await Coupon.create(couponData);
        console.log(`  ✅ Created: ${couponData.code} (${couponData.name})`);
      } else {
        console.log(`  ℹ️  Already exists: ${couponData.code}`);
      }
    }

    console.log('\n✅ Coupon system is ready!');
    console.log('\n📝 Features:');
    console.log('  ✓ Percentage discounts (e.g., 10% off)');
    console.log('  ✓ Fixed amount discounts (e.g., ₺50 off)');
    console.log('  ✓ Free shipping coupons');
    console.log('  ✓ Usage limits (total & per user)');
    console.log('  ✓ Validity period (start/end dates)');
    console.log('  ✓ Minimum order amount');
    console.log('  ✓ First order only coupons');
    console.log('  ✓ Max discount amount (for percentage)');

    console.log('\n📝 Sample Coupons Created:');
    console.log('  WELCOME10  - 10% off first order (min ₺50)');
    console.log('  SUMMER2024 - 20% off all products (min ₺200)');
    console.log('  FREESHIP   - Free shipping (min ₺150)');
    console.log('  SAVE50     - ₺50 off (min ₺300)');

    console.log('\n📝 API Endpoints:');
    console.log('  Public:');
    console.log('    GET  /api/v1/coupons/active');
    console.log('    POST /api/v1/coupons/validate');
    console.log('  User:');
    console.log('    GET  /api/v1/coupons/my-history');
    console.log('  Admin:');
    console.log('    POST /api/v1/coupons');
    console.log('    GET  /api/v1/coupons');
    console.log('    GET  /api/v1/coupons/:id');
    console.log('    PATCH /api/v1/coupons/:id');
    console.log('    DELETE /api/v1/coupons/:id');
    console.log('    GET  /api/v1/coupons/:id/stats');

    console.log('\n📝 Next steps:');
    console.log('  1. Restart your backend server');
    console.log('  2. Add coupon field to Order model');
    console.log('  3. Update checkout to apply coupons');
    console.log('  4. Create admin coupon management UI');
    console.log('  5. Add coupon input to checkout page');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating coupon tables:', error);
    console.error('Details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createCouponTables();
}

module.exports = createCouponTables;








