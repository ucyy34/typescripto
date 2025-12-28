'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'idempotency_key', {
      type: Sequelize.STRING(36), // UUID or similar string
      allowNull: true,
      unique: true,
      comment: 'Key to prevent duplicate order processing',
    });

    await queryInterface.addIndex('orders', ['idempotency_key'], {
      unique: true,
      name: 'orders_idempotency_key_unique',
      where: {
        idempotency_key: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('orders', 'orders_idempotency_key_unique');
    await queryInterface.removeColumn('orders', 'idempotency_key');
  }
};
