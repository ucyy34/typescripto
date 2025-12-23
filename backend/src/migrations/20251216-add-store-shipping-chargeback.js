'use strict';

/**
 * Migration: Add shipping_store_owes_platform to orders
 * Tracks how much of platform-covered shipping the store owes back
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add shipping_store_owes_platform column
        await queryInterface.addColumn('orders', 'shipping_store_owes_platform', {
            type: Sequelize.DECIMAL(10, 2),
            defaultValue: 0.0,
            allowNull: true,
            comment: 'Amount store owes platform for shipping coverage',
        });

        // Add default platform setting for store charge percentage
        const { QueryTypes } = Sequelize;

        // Check if setting exists
        const existing = await queryInterface.sequelize.query(
            `SELECT id FROM platform_settings WHERE key = 'store_shipping_charge_percentage'`,
            { type: QueryTypes.SELECT }
        );

        if (existing.length === 0) {
            await queryInterface.bulkInsert('platform_settings', [
                {
                    id: require('crypto').randomUUID(),
                    key: 'store_shipping_charge_percentage',
                    value: '50',
                    value_type: 'number',
                    description: 'Platformun karşıladığı kargonun yüzde kaçı mağazaya yansıtılsın (%0-100)',
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('orders', 'shipping_store_owes_platform');
        await queryInterface.bulkDelete('platform_settings', {
            key: 'store_shipping_charge_percentage',
        });
    },
};
