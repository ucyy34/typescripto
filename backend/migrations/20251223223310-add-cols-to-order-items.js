'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add columns to order_items
    await queryInterface.addColumn('order_items', 'unit_amount_cents', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0, // safe default for migration, code will enforce
    });

    await queryInterface.addColumn('order_items', 'line_total_amount_cents', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('order_items', 'currency', {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'TRY',
    });

    await queryInterface.addColumn('order_items', 'vendor_id', {
      type: Sequelize.UUID,
      allowNull: true, // Initially nullable to prevent breakage, updated via data migration if needed
    });

    // Attempt to backfill vendor_id from products if possible, or just set to existing store_id logic
    // For now, we allow NULL to let the migration pass, but code will enforce NOT NULL for new records.
    // Or simpler: we update existing rows to match store_id if that's the logic.
    // Given shared vendor/store logic:
    // await queryInterface.sequelize.query('UPDATE order_items SET vendor_id = (SELECT store_id FROM orders WHERE orders.id = order_items.order_id)');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_items', 'unit_amount_cents');
    await queryInterface.removeColumn('order_items', 'line_total_amount_cents');
    await queryInterface.removeColumn('order_items', 'currency');
    await queryInterface.removeColumn('order_items', 'vendor_id');
  }
};
