/**
 * Add Commission Rate to Categories
 * Adds commission_rate column to categories table
 */

const { sequelize } = require('../config/sequelize');

async function addCategoryCommission() {
  try {
    console.log('🔄 Adding commission_rate to categories table...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      AND column_name = 'commission_rate';
    `);

    if (columns.length > 0) {
      console.log('ℹ️  commission_rate column already exists');
      process.exit(0);
    }

    // Add commission_rate column
    await sequelize.query(`
      ALTER TABLE categories 
      ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT NULL;
    `);

    // Add comment
    await sequelize.query(`
      COMMENT ON COLUMN categories.commission_rate 
      IS 'Category-specific commission rate (overrides global) - null means use global settings';
    `);

    console.log('✅ commission_rate column added successfully');

    // Show current categories
    const [categories] = await sequelize.query(`
      SELECT id, name, commission_rate 
      FROM categories 
      ORDER BY name;
    `);

    console.log('\n📊 Current Categories:');
    console.table(categories);

    console.log('\n✅ Migration completed!');
    console.log('\n📝 Notes:');
    console.log('  - commission_rate is NULL by default (uses global 15%)');
    console.log('  - Set category-specific rates in admin panel');
    console.log('  - Example: "Cam Sanatı" → 12%, "Ahşap" → 10%');
    console.log('  - NULL = uses global settings from commission_settings');

    console.log('\n🎯 Next Steps:');
    console.log('  1. Admin panel: Add commission input to category form');
    console.log('  2. Update commission service to check category rates');
    console.log('  3. Test with different category rates');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding commission_rate:', error);
    console.error('Details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  addCategoryCommission();
}

module.exports = addCategoryCommission;










