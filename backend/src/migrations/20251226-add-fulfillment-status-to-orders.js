'use strict';

/**
 * Phase 8.1: Add processing, shipped, delivered statuses to orders ENUM
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // PostgreSQL: Add new values to existing ENUM type
        // IF NOT EXISTS prevents errors if already added
        await queryInterface.sequelize.query(`
      ALTER TYPE enum_orders_status ADD VALUE IF NOT EXISTS 'processing';
    `);
        await queryInterface.sequelize.query(`
      ALTER TYPE enum_orders_status ADD VALUE IF NOT EXISTS 'shipped';
    `);
        await queryInterface.sequelize.query(`
      ALTER TYPE enum_orders_status ADD VALUE IF NOT EXISTS 'delivered';
    `);

        console.log('✅ Added processing, shipped, delivered to order status ENUM');
    },

    async down(queryInterface, Sequelize) {
        // PostgreSQL doesn't support removing ENUM values easily
        // This migration is not reversible
        console.log('⚠️ Cannot remove ENUM values in PostgreSQL');
    }
};
