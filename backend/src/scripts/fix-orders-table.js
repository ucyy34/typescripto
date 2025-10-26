/**
 * Fix orders table to allow NULL user_id for guest checkout
 */

const { sequelize } = require('../config/sequelize');

async function fixOrdersTable() {
    try {
        console.log('🔧 Fixing orders table...');

        // Drop NOT NULL constraint from user_id
        await sequelize.query(`
            ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
        `);

        console.log('✅ Orders table fixed successfully!');
        console.log('   - user_id can now be NULL (guest checkout)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing orders table:', error);
        process.exit(1);
    }
}

fixOrdersTable();
