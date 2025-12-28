'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add new values to the existing ENUM type in Postgres
        // We cannot easily remove values without a complex migration, so we just add the new ones we need.
        // 'pending', 'confirmed', 'draft' are needed.
        // 'cancelled' likely exists.

        try {
            await queryInterface.sequelize.query(`ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'pending';`);
        } catch (e) { console.log('Enum value pending might already exist or error:', e.message); }

        try {
            await queryInterface.sequelize.query(`ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'confirmed';`);
        } catch (e) { console.log('Enum value confirmed might already exist or error:', e.message); }

        try {
            await queryInterface.sequelize.query(`ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'draft';`);
        } catch (e) { console.log('Enum value draft might already exist or error:', e.message); }
    },

    async down(queryInterface, Sequelize) {
        // Reverting ENUM additions in Postgres is not supported nicely without dropping/recreating.
        // We will skip strict reversion here to avoid data loss on rollback of this specific fix.
        // Ideally we would cycle the type, but for this project scope, adding is sufficient.
        console.log('Down migration for Enum fix skipped intentionally to prevent data loss.');
    }
};
