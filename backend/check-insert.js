const { sequelize } = require('./src/config/sequelize');
const { DataTypes } = require('sequelize');

// Define simplified model to test insertion
const Order = sequelize.define('Order', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    status: { type: DataTypes.ENUM('draft', 'pending', 'confirmed', 'cancelled'), defaultValue: 'pending' },
    store_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 }, // Dummy
}, { tableName: 'orders', timestamps: false });

async function checkInsert() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB:', sequelize.config.database);

        console.log('Attempting insert with status="pending"...');
        // Minimal insert (might fail on other constraints like Not Nulls, but we just want to see if Status Enum fails first)
        // Actually, constraints will fail. I should construct a valid object? 
        // Or just use Raw Query to test the Enum value specifically.

        // Test 1: Raw Query
        try {
            await sequelize.query(`INSERT INTO orders (id, status, store_id, user_id, payment_status, subtotal, total, shipping_address, created_at, updated_at) VALUES ('${crypto.randomUUID()}', 'pending', '${crypto.randomUUID()}', '${crypto.randomUUID()}', 'pending', 0, 0, '{}', NOW(), NOW())`);
            console.log('✅ Raw Insert Success');
        } catch (e) {
            console.error('❌ Raw Insert Failed:', e.message);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

const crypto = require('crypto');
checkInsert();
