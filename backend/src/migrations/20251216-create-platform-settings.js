'use strict';

/**
 * Migration: Create platform_settings table
 * Stores platform-wide configuration settings like default shipping cost
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('platform_settings', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            key: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            value: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            value_type: {
                type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
                defaultValue: 'string',
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            updated_by: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add unique index on key
        await queryInterface.addIndex('platform_settings', ['key'], {
            unique: true,
            name: 'platform_settings_key_unique',
        });

        // Seed default shipping cost
        await queryInterface.bulkInsert('platform_settings', [
            {
                id: require('crypto').randomUUID(),
                key: 'default_shipping_cost',
                value: '35.00',
                value_type: 'number',
                description: 'Varsayılan platform kargo maliyeti (TL)',
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('platform_settings');
    },
};
