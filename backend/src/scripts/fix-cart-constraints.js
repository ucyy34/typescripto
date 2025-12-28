const { sequelize } = require('../models');

async function fix() {
    const queryInterface = sequelize.getQueryInterface();
    try {
        console.log('Attempting to remove unique constraint on cart_items (cart_id, product_id)...');
        // Common Names for Sequelize unique constraints
        // 1. cart_items_cart_id_product_id_key
        // 2. cart_items_cart_id_product_id_unique

        try {
            await queryInterface.removeConstraint('cart_items', 'cart_items_cart_id_product_id_key');
            console.log('✅ Removed constraint: cart_items_cart_id_product_id_key');
        } catch (e) {
            console.log('⚠️ Could not remove cart_items_cart_id_product_id_key:', e.message);
        }

        try {
            await queryInterface.removeIndex('cart_items', 'cart_items_cart_id_product_id');
            console.log('✅ Removed index: cart_items_cart_id_product_id');
        } catch (e) {
            console.log('⚠️ Could not remove index cart_items_cart_id_product_id:', e.message);
        }

        console.log('Constraint cleanup complete.');
        process.exit(0);
    } catch (e) {
        console.error('Script failed:', e);
        process.exit(1);
    }
}

fix();
