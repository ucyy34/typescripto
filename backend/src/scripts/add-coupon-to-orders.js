/**
 * Add Coupon Fields to Orders Table
 * Adds coupon_code and coupon_discount columns
 */

const { sequelize } = require('../config/sequelize');

async function addCouponToOrders() {
  try {
    console.log('🎟️  Adding coupon fields to orders table...');

    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if columns already exist
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('coupon_code', 'coupon_discount');
    `);

    if (columns.length >= 2) {
      console.log('ℹ️  Coupon columns already exist');
      process.exit(0);
    }

    // Add coupon_code column
    if (!columns.find(c => c.column_name === 'coupon_code')) {
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL;
      `);
      await sequelize.query(`
        COMMENT ON COLUMN orders.coupon_code 
        IS 'Applied coupon code';
      `);
      console.log('✅ coupon_code column added');
    }

    // Add coupon_discount column
    if (!columns.find(c => c.column_name === 'coupon_discount')) {
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0.0;
      `);
      await sequelize.query(`
        COMMENT ON COLUMN orders.coupon_discount 
        IS 'Discount from coupon';
      `);
      console.log('✅ coupon_discount column added');
    }

    // Update discount column comment
    await sequelize.query(`
      COMMENT ON COLUMN orders.discount 
      IS 'Total discount (coupons + other discounts)';
    `);

    console.log('\n✅ Migration completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. Restart backend server');
    console.log('  2. Update checkout to apply coupons');
    console.log('  3. Test coupon system');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  addCouponToOrders();
}

module.exports = addCouponToOrders;








