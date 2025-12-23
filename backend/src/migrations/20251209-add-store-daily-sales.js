'use strict';

/**
 * Migration: Add store_daily_sales table
 * Tracks daily successful order counts per store for the siftah system
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('store_daily_sales', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            store_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'stores',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            sale_date: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            successful_order_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            first_order_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            last_order_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Unique constraint for upsert operations
        await queryInterface.addConstraint('store_daily_sales', {
            fields: ['store_id', 'sale_date'],
            type: 'unique',
            name: 'uq_store_daily_sales',
        });

        // Performance indexes
        await queryInterface.addIndex('store_daily_sales', ['sale_date'], {
            name: 'idx_sds_date',
        });

        await queryInterface.addIndex('store_daily_sales', ['store_id', 'sale_date'], {
            name: 'idx_sds_store_date',
        });

        await queryInterface.addIndex('store_daily_sales', ['sale_date', 'successful_order_count'], {
            name: 'idx_sds_date_count',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('store_daily_sales');
    },
};
