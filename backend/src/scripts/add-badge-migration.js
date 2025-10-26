/**
 * Add Product Badges Column
 * Adds badges JSONB column for product badges like handmade, limited, eco-friendly, etc.
 */

require('dotenv').config();
const { sequelize } = require('../config/sequelize');

async function addBadgeColumn() {
  try {
    console.log('\n🔄 Adding badges column to products table...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Add badges column (JSONB array)
    await sequelize.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Added badges column to products table');

    console.log('\n✅ Migration completed successfully!\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

addBadgeColumn();
