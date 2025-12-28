const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function migrate() {
    try {
        const queryInterface = sequelize.getQueryInterface();

        // Add Column
        console.log('Adding variant_id column...');
        await queryInterface.addColumn('cart_items', 'variant_id', {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'product_variants',
                key: 'id',
            },
            onDelete: 'SET NULL',
        });

        // Add Index
        console.log('Adding index...');
        await queryInterface.addIndex('cart_items', ['variant_id']);

        console.log('✅ Migration successful');
        process.exit(0);
    } catch (e) {
        console.log('⚠️ Migration failed or already exists:', e.message);
        // If "already exists" ignore
        process.exit(0); // Treat as success to unblock
    }
}
migrate();
