/**
 * One-time script to add fulfillment status values to order ENUM
 */
const { sequelize } = require('../models');

async function addEnumValues() {
    console.log('Adding ENUM values...');

    try {
        // Run each ALTER separately to handle IF NOT EXISTS properly
        await sequelize.query(`ALTER TYPE enum_orders_status ADD VALUE IF NOT EXISTS 'processing'`);
        console.log('✅ Added: processing');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('ℹ️  processing already exists');
        } else {
            console.log('⚠️  processing:', e.message);
        }
    }

    try {
        await sequelize.query(`ALTER TYPE enum_orders_status ADD VALUE IF NOT EXISTS 'shipped'`);
        console.log('✅ Added: shipped');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('ℹ️  shipped already exists');
        } else {
            console.log('⚠️  shipped:', e.message);
        }
    }

    try {
        await sequelize.query(`ALTER TYPE enum_orders_status ADD VALUE IF NOT EXISTS 'delivered'`);
        console.log('✅ Added: delivered');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('ℹ️  delivered already exists');
        } else {
            console.log('⚠️  delivered:', e.message);
        }
    }

    console.log('\n🎉 Done! ENUM values added.');
    await sequelize.close();
    process.exit(0);
}

addEnumValues().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
