/**
 * Migration: Add Category and Product Variants
 * Creates tables for category-based product variants
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create category_variants table
    await queryInterface.createTable('category_variants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('color', 'text', 'image'),
        defaultValue: 'text',
        allowNull: false,
      },
      options: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('category_variants', ['category_id']);
    await queryInterface.addIndex('category_variants', ['category_id', 'name'], {
      unique: true,
      name: 'unique_category_variant_name',
    });

    // Create product_variants table
    await queryInterface.createTable('product_variants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      category_variant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'category_variants',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      variant_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      selected_options: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('product_variants', ['product_id']);
    await queryInterface.addIndex('product_variants', ['category_variant_id']);
    await queryInterface.addIndex('product_variants', ['product_id', 'category_variant_id'], {
      unique: true,
      name: 'unique_product_variant',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (due to foreign keys)
    await queryInterface.dropTable('product_variants');
    await queryInterface.dropTable('category_variants');
  },
};
