'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add material column
        await queryInterface.addColumn('products', 'material', {
            type: Sequelize.STRING(200),
            allowNull: true,
            comment: 'Product material (e.g., wood, ceramic, glass)',
        });

        // Add technique column
        await queryInterface.addColumn('products', 'technique', {
            type: Sequelize.STRING(200),
            allowNull: true,
            comment: 'Crafting technique (e.g., hand-carved, blown glass)',
        });

        console.log('✅ Added material and technique columns to products table');
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('products', 'material');
        await queryInterface.removeColumn('products', 'technique');
        console.log('✅ Removed material and technique columns from products table');
    },
};
