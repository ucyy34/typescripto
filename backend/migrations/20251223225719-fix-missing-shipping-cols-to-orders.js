'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'orders';
    const cols = [
      { name: 'shipping_actual_cost', type: Sequelize.DECIMAL(10, 2), default: 0.0, comment: 'Actual shipping cost' },
      { name: 'shipping_customer_paid', type: Sequelize.DECIMAL(10, 2), default: 0.0, comment: 'Customer shipping payment' },
      { name: 'shipping_store_covered', type: Sequelize.DECIMAL(10, 2), default: 0.0, comment: 'Store covered shipping' },
      { name: 'shipping_platform_covered', type: Sequelize.DECIMAL(10, 2), default: 0.0, comment: 'Platform covered shipping' },
      { name: 'shipping_store_owes_platform', type: Sequelize.DECIMAL(10, 2), default: 0.0, comment: 'Store owes platform' },
      { name: 'shipping_rule_id', type: Sequelize.UUID, allowNull: true, comment: 'Applied shipping rule ID' }
    ];

    for (const col of cols) {
      try {
        await queryInterface.addColumn(table, col.name, {
          type: col.type,
          defaultValue: col.default,
          allowNull: col.allowNull !== undefined ? col.allowNull : false,
          comment: col.comment
        });
      } catch (e) {
        console.log(`Column ${col.name} likely exists, skipping.`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'shipping_actual_cost');
    await queryInterface.removeColumn('orders', 'shipping_customer_paid');
    await queryInterface.removeColumn('orders', 'shipping_store_covered');
    await queryInterface.removeColumn('orders', 'shipping_platform_covered');
    await queryInterface.removeColumn('orders', 'shipping_store_owes_platform');
    await queryInterface.removeColumn('orders', 'shipping_rule_id');
  }
};
