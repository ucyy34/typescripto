'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('product_variants', 'sku', {
            type: Sequelize.STRING(100),
            allowNull: true,
            unique: true,
            comment: 'Optional SKU for this variant option',
        });

        await queryInterface.addColumn('product_variants', 'price_override', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Optional price override when this variant is selected',
        });

        await queryInterface.addColumn('product_variants', 'stock', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Optional stock value for this variant option',
        });

        // Add index for SKU
        await queryInterface.addIndex('product_variants', ['sku'], {
            unique: true,
            name: 'unique_product_variant_sku_model',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('product_variants', 'unique_product_variant_sku_model');
        await queryInterface.removeColumn('product_variants', 'stock');
        await queryInterface.removeColumn('product_variants', 'price_override');
        await queryInterface.removeColumn('product_variants', 'sku');
    },
};
