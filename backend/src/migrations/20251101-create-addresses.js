'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('addresses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'User who owns this address',
      },
      type: {
        type: Sequelize.ENUM('shipping', 'billing', 'both'),
        defaultValue: 'shipping',
        allowNull: false,
        comment: 'Address type: shipping, billing, or both',
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'User-friendly label (e.g., "Home", "Office")',
      },
      full_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Recipient full name',
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Street address, building number, apartment',
      },
      address_line2: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Additional address details (floor, door number, etc.)',
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'State/Province',
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'Turkey',
        allowNull: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Is this the default address for the user',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional delivery notes or instructions',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('addresses', ['user_id']);
    await queryInterface.addIndex('addresses', ['user_id', 'is_default']);
    await queryInterface.addIndex('addresses', ['type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('addresses');
  },
};
