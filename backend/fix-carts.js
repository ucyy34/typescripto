/**
 * Emergency fix script for carts tables
 * Run with: node fix-carts.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: console.log
    }
);

async function fixCarts() {
    try {
        console.log('Connecting to:', process.env.DB_NAME, 'as', process.env.DB_USER);

        // 1. Drop existing tables
        console.log('\n1. Dropping existing tables...');
        await sequelize.query('DROP TABLE IF EXISTS "cart_items" CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS "carts" CASCADE');
        console.log('   Done!');

        // 2. Create carts table
        console.log('\n2. Creating carts table...');
        await sequelize.query(`
      CREATE TABLE carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        guest_key VARCHAR(255) UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);
        console.log('   Done!');

        // 3. Create cart_items table
        console.log('\n3. Creating cart_items table...');
        await sequelize.query(`
      CREATE TABLE cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        price_cents INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(cart_id, product_id)
      )
    `);
        console.log('   Done!');

        // 4. Verify
        console.log('\n4. Verifying...');
        const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'carts' ORDER BY ordinal_position
    `);
        console.log('   Carts columns:', cols.map(c => c.column_name).join(', '));

        console.log('\n✅ SUCCESS! Carts tables fixed.');
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        await sequelize.close();
    }
}

fixCarts();
