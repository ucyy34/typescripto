'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // 1. Allow user_id to be NULL (for guest carts)
            await queryInterface.changeColumn('carts', 'user_id', {
                type: Sequelize.UUID,
                allowNull: true,
            }, { transaction });

            // 2. Add guest_key column (Unique, Nullable)
            // Note: In Postgres, multiple NULLs are allowed in a UNIQUE column, which is perfect.
            // We want guest_key to be unique when it IS set.
            await queryInterface.addColumn('carts', 'guest_key', {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true,
            }, { transaction });

            // 3. Add index for faster lookup by guest_key
            // (Unique constraint already creates an index, but explicit index is fine too if we wanted partial index)
            // The unique: true above suffices for the index.

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // 1. Remove guest_key
            await queryInterface.removeColumn('carts', 'guest_key', { transaction });

            // 2. Revert user_id to NOT NULL
            // WARNING: This will fail if there are any guest carts (user_id IS NULL) in the DB.
            // Ideally we would delete them first.
            await queryInterface.bulkDelete('carts', { user_id: null }, { transaction });

            await queryInterface.changeColumn('carts', 'user_id', {
                type: Sequelize.UUID,
                allowNull: false,
            }, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
