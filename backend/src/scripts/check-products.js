/**
 * Check Products Table - Debug Script
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

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

async function checkProducts() {
  try {
    console.log('\n🔍 Checking Products Table...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Query all products
    const [products] = await sequelize.query(`
      SELECT
        id,
        store_id,
        category_id,
        title,
        price,
        stock,
        status,
        is_active,
        created_at,
        deleted_at
      FROM products
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC;
    `);

    console.log(`📦 Found ${products.length} products (not deleted):\n`);

    products.forEach((p, index) => {
      const statusIcon = p.status === 'approved' ? '✅' : p.status === 'pending' ? '⏳' : '❌';
      const activeIcon = p.is_active ? '🟢' : '⚫';
      console.log(`${index + 1}. ${statusIcon} ${activeIcon} ${p.title}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Store: ${p.store_id}`);
      console.log(`   Status: ${p.status}, Active: ${p.is_active}`);
      console.log(`   Price: ${p.price}, Stock: ${p.stock}`);
      console.log('');
    });

    // Check specific store
    const targetStoreId = '06cb9675-4c3c-434f-afc4-dc8658dc4ecc';
    const [storeProducts] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products
      WHERE store_id = '${targetStoreId}' AND deleted_at IS NULL;
    `);

    console.log(`\n📊 Store ${targetStoreId}:`);
    console.log(`   Products: ${storeProducts[0].count}\n`);

    await sequelize.close();
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProducts();
