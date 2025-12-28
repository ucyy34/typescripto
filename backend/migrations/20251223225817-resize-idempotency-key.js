'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('orders', 'idempotency_key', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Key to prevent duplicate order processing',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert logic
  }
};
