/**
 * Migration: Add coupon_code and coupon_discount to orders
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'coupon_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Applied coupon code',
    });

    await queryInterface.addColumn('orders', 'coupon_discount', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Discount from coupon',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('orders', 'coupon_code');
    await queryInterface.removeColumn('orders', 'coupon_discount');
  },
};




