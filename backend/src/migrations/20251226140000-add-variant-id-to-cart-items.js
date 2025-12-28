'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('cart_items', 'variant_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'product_variants',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'Reference to selected product variant',
        });

        // Add index for faster lookups
        await queryInterface.addIndex('cart_items', ['variant_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('cart_items', 'variant_id');
    },
};
