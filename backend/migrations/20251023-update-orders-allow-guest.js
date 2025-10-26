/**
 * Migration: Allow guest checkout
 * Makes user_id nullable in orders table to support guest checkout
 * Date: 2025-10-23
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Allow user_id to be NULL for guest orders
    await queryInterface.changeColumn('orders', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true, // Changed from false to true
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL', // Changed from RESTRICT to SET NULL
    });

    console.log('✅ Migration: Orders table updated - guest checkout now supported');
  },

  async down(queryInterface, Sequelize) {
    // Revert: Make user_id required again
    await queryInterface.changeColumn('orders', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false, // Back to required
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT', // Back to restrict
    });

    console.log('⏪ Migration: Orders table reverted - guest checkout disabled');
  },
};
