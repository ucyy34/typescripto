/**
 * Check Categories Table - Debug Script
 * Queries the categories table directly to see actual IDs
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'dostan_marketplace_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function checkCategories() {
  try {
    console.log('\n🔍 Checking Categories Table...\n');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    console.log(`📊 Database: ${process.env.DB_NAME || 'dostan_marketplace_dev'}\n`);

    // Query all categories
    const [categories] = await sequelize.query(`
      SELECT id, name, slug, parent_id, created_at, deleted_at
      FROM categories
      ORDER BY parent_id NULLS FIRST, name;
    `);

    console.log(`📦 Found ${categories.length} categories:\n`);

    categories.forEach((cat, index) => {
      const status = cat.deleted_at ? '❌ SOFT DELETED' : '✅ Active';
      const parentInfo = cat.parent_id ? `(parent: ${cat.parent_id.substring(0, 8)}...)` : '(TOP LEVEL)';
      console.log(`${index + 1}. ${status} ${cat.name} ${parentInfo}`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Slug: ${cat.slug}`);
      if (cat.deleted_at) {
        console.log(`   Deleted: ${cat.deleted_at}`);
      }
      console.log('');
    });

    // Check specific ID from error
    const textileId = 'f98af29f-ce82-4748-8755-5bb6f4ded7b9';
    const [textileCheck] = await sequelize.query(`
      SELECT * FROM categories WHERE id = '${textileId}';
    `);

    console.log(`\n🔎 Checking specific ID from error (${textileId}):`);
    if (textileCheck.length > 0) {
      console.log('✅ FOUND:', textileCheck[0]);
    } else {
      console.log('❌ NOT FOUND in database');
    }

    // Check foreign key constraints
    const [constraints] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'products'
        AND kcu.column_name = 'category_id';
    `);

    console.log('\n🔗 Foreign Key Constraints on products.category_id:');
    if (constraints.length > 0) {
      constraints.forEach(c => {
        console.log(`   ${c.constraint_name}: products.${c.column_name} -> ${c.foreign_table_name}.${c.foreign_column_name}`);
      });
    } else {
      console.log('   ⚠️ No foreign key constraints found!');
    }

    await sequelize.close();
    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkCategories();
