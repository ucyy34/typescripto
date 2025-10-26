/**
 * Run Variant Migration Manually
 * Creates category_variants and product_variants tables
 */

require('dotenv').config();
const { sequelize } = require('../config/sequelize');

async function runMigration() {
  try {
    console.log('\n🔄 Running variant tables migration...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Create category_variants table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS category_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (type IN ('color', 'text', 'image')),
        options JSONB NOT NULL DEFAULT '[]',
        is_required BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ,
        CONSTRAINT unique_category_variant_name UNIQUE (category_id, name)
      );
    `);

    console.log('✅ Created category_variants table');

    // Create indexes for category_variants
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_category_variants_category_id
      ON category_variants(category_id);
    `);

    console.log('✅ Created category_variants indexes');

    // Create product_variants table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
        category_variant_id UUID NOT NULL REFERENCES category_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        variant_name VARCHAR(100) NOT NULL,
        selected_options JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ,
        CONSTRAINT unique_product_variant UNIQUE (product_id, category_variant_id)
      );
    `);

    console.log('✅ Created product_variants table');

    // Create indexes for product_variants
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
      ON product_variants(product_id);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_category_variant_id
      ON product_variants(category_variant_id);
    `);

    console.log('✅ Created product_variants indexes');

    console.log('\n✅ Migration completed successfully!\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runMigration();
