'use strict';

/**
 * Migration: Add cascade variant fields to product_variants table
 * Adds: color_hex, color_name, variant_type, variant_value, image_url, discount_percent, discount_ends_at, is_active
 * Makes category_variant_id nullable for new system
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Check if columns exist before adding
            const tableInfo = await queryInterface.describeTable('product_variants');

            // Add color_hex if not exists
            if (!tableInfo.color_hex) {
                await queryInterface.addColumn('product_variants', 'color_hex', {
                    type: Sequelize.STRING(7),
                    allowNull: true,
                    comment: 'Hex color code (e.g., #000000)',
                }, { transaction });
            }

            // Add color_name if not exists
            if (!tableInfo.color_name) {
                await queryInterface.addColumn('product_variants', 'color_name', {
                    type: Sequelize.STRING(50),
                    allowNull: true,
                    comment: 'Color name (e.g., Siyah)',
                }, { transaction });
            }

            // Add variant_type if not exists
            if (!tableInfo.variant_type) {
                await queryInterface.addColumn('product_variants', 'variant_type', {
                    type: Sequelize.STRING(50),
                    allowNull: true,
                    comment: 'Variant type key (e.g., beden, boyut, agirlik)',
                }, { transaction });
            }

            // Add variant_value if not exists
            if (!tableInfo.variant_value) {
                await queryInterface.addColumn('product_variants', 'variant_value', {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    comment: 'Selected value (e.g., L, 100g, Küçük)',
                }, { transaction });
            }

            // Add image_url if not exists
            if (!tableInfo.image_url) {
                await queryInterface.addColumn('product_variants', 'image_url', {
                    type: Sequelize.TEXT,
                    allowNull: true,
                    comment: 'Optional variant-specific image',
                }, { transaction });
            }

            // Add discount_percent if not exists
            if (!tableInfo.discount_percent) {
                await queryInterface.addColumn('product_variants', 'discount_percent', {
                    type: Sequelize.DECIMAL(5, 2),
                    allowNull: true,
                    comment: 'Discount percentage (e.g., 20.00 for 20%)',
                }, { transaction });
            }

            // Add discount_ends_at if not exists
            if (!tableInfo.discount_ends_at) {
                await queryInterface.addColumn('product_variants', 'discount_ends_at', {
                    type: Sequelize.DATE,
                    allowNull: true,
                    comment: 'When the discount expires',
                }, { transaction });
            }

            // Add is_active if not exists
            if (!tableInfo.is_active) {
                await queryInterface.addColumn('product_variants', 'is_active', {
                    type: Sequelize.BOOLEAN,
                    defaultValue: true,
                    comment: 'Whether this variant is available for purchase',
                }, { transaction });
            }

            // Modify price column - rename price_override to price if needed
            if (tableInfo.price_override && !tableInfo.price) {
                await queryInterface.renameColumn('product_variants', 'price_override', 'price', { transaction });
            } else if (!tableInfo.price) {
                await queryInterface.addColumn('product_variants', 'price', {
                    type: Sequelize.DECIMAL(10, 2),
                    allowNull: true,
                    comment: 'Variant price',
                }, { transaction });
            }

            // Make category_variant_id nullable (for new system)
            await queryInterface.changeColumn('product_variants', 'category_variant_id', {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'category_variants',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            }, { transaction });

            // Make variant_name nullable
            if (tableInfo.variant_name) {
                await queryInterface.changeColumn('product_variants', 'variant_name', {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                }, { transaction });
            }

            // Add unique index for new variant combination
            await queryInterface.addIndex('product_variants',
                ['product_id', 'color_hex', 'variant_type', 'variant_value'],
                {
                    name: 'unique_variant_combination',
                    unique: true,
                    where: {
                        deleted_at: null
                    },
                    transaction
                }
            ).catch(() => {
                // Index may already exist
                console.log('Index unique_variant_combination may already exist, skipping...');
            });

            await transaction.commit();
            console.log('✅ Migration completed successfully');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Remove new columns
            const columnsToRemove = [
                'color_hex', 'color_name', 'variant_type', 'variant_value',
                'image_url', 'discount_percent', 'discount_ends_at', 'is_active'
            ];

            for (const column of columnsToRemove) {
                await queryInterface.removeColumn('product_variants', column, { transaction })
                    .catch(() => console.log(`Column ${column} may not exist, skipping...`));
            }

            // Remove index
            await queryInterface.removeIndex('product_variants', 'unique_variant_combination', { transaction })
                .catch(() => console.log('Index may not exist, skipping...'));

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
