/**
 * Cleanup Guest Carts Script
 * 
 * Hard-deletes guest carts older than 7 days.
 * Run via: npm run guest:cleanup
 * 
 * Can be scheduled as cron job: 0 3 * * * (daily at 3am)
 */

require('dotenv').config();

const { sequelize } = require('../config/sequelize');
const { Op } = require('sequelize');

// Load models
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');

const DAYS_OLD = 7;

async function cleanupGuestCarts() {
    console.log('========================================');
    console.log('🧹 Guest Cart Cleanup');
    console.log(`   TTL: ${DAYS_OLD} days`);
    console.log('========================================\n');

    try {
        // Calculate cutoff date
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - DAYS_OLD);

        console.log(`Cutoff date: ${cutoff.toISOString()}`);
        console.log('');

        // Find old guest carts
        const oldGuestCarts = await Cart.findAll({
            where: {
                guest_key: { [Op.ne]: null },
                user_id: null,
                updated_at: { [Op.lt]: cutoff }
            },
            attributes: ['id', 'guest_key', 'updated_at'],
            paranoid: false // Include soft-deleted
        });

        if (oldGuestCarts.length === 0) {
            console.log('✅ No old guest carts found. Nothing to clean up.');
            return { cleaned: 0 };
        }

        console.log(`Found ${oldGuestCarts.length} old guest carts to delete:`);
        oldGuestCarts.forEach(cart => {
            console.log(`   - ${cart.id} (last updated: ${cart.updated_at})`);
        });
        console.log('');

        const cartIds = oldGuestCarts.map(c => c.id);

        // Delete cart items first (cascade)
        const deletedItems = await CartItem.destroy({
            where: { cart_id: { [Op.in]: cartIds } },
            force: true
        });
        console.log(`🗑️  Deleted ${deletedItems} cart items`);

        // Delete carts (hard delete)
        const deletedCarts = await Cart.destroy({
            where: { id: { [Op.in]: cartIds } },
            force: true
        });
        console.log(`🗑️  Deleted ${deletedCarts} guest carts`);

        console.log('\n✅ Cleanup complete!');
        return { cleaned: deletedCarts, itemsDeleted: deletedItems };
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run if called directly
if (require.main === module) {
    cleanupGuestCarts()
        .then(result => {
            console.log('\nResult:', JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { cleanupGuestCarts };
