'use strict';

/**
 * Migration: Add price_cents columns to products table
 * 
 * This migration adds cents-based columns for monetary values:
 * - price_cents: Main product price in cents (INTEGER)
 * - compare_price_cents: Original/compare price in cents (INTEGER)
 * - cost_price_cents: Cost to seller in cents (INTEGER)
 * 
 * The existing decimal columns (price, compare_price, cost_price) are retained
 * for backward compatibility but should be considered DEPRECATED.
 * 
 * After migration, data is populated from existing decimal columns.
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Add price_cents column
            await queryInterface.addColumn(
                'products',
                'price_cents',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true, // Allow null initially for data migration
                    comment: 'Product price in cents (source of truth)',
                },
                { transaction }
            );

            // Add compare_price_cents column
            await queryInterface.addColumn(
                'products',
                'compare_price_cents',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'Original/compare price in cents for discount display',
                },
                { transaction }
            );

            // Add cost_price_cents column
            await queryInterface.addColumn(
                'products',
                'cost_price_cents',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'Cost to seller in cents (not shown to buyers)',
                },
                { transaction }
            );

            // Populate price_cents from existing price column
            await queryInterface.sequelize.query(
                `UPDATE products SET price_cents = ROUND(price * 100) WHERE price IS NOT NULL`,
                { transaction }
            );

            // Populate compare_price_cents from existing compare_price column
            await queryInterface.sequelize.query(
                `UPDATE products SET compare_price_cents = ROUND(compare_price * 100) WHERE compare_price IS NOT NULL`,
                { transaction }
            );

            // Populate cost_price_cents from existing cost_price column
            await queryInterface.sequelize.query(
                `UPDATE products SET cost_price_cents = ROUND(cost_price * 100) WHERE cost_price IS NOT NULL`,
                { transaction }
            );

            // Add index on price_cents for efficient queries
            await queryInterface.addIndex('products', ['price_cents'], {
                name: 'products_price_cents_idx',
                transaction,
            });

            await transaction.commit();

            console.log('✅ Successfully added price_cents columns to products table');
            console.log('📝 Data migrated from existing decimal columns');

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Remove index
            await queryInterface.removeIndex('products', 'products_price_cents_idx', { transaction });

            // Remove columns
            await queryInterface.removeColumn('products', 'price_cents', { transaction });
            await queryInterface.removeColumn('products', 'compare_price_cents', { transaction });
            await queryInterface.removeColumn('products', 'cost_price_cents', { transaction });

            await transaction.commit();

            console.log('✅ Successfully removed price_cents columns from products table');

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
