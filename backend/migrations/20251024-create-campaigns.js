/**
 * Migration: Create campaigns table
 * Marketing campaigns for products and categories
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('campaigns', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      // Basic Info
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Campaign Type
      campaign_type: {
        type: Sequelize.ENUM(
          'FLASH_SALE',
          'BUY_X_GET_Y',
          'CATEGORY_DISCOUNT',
          'FREE_SHIPPING',
          'BUNDLE_DEAL',
          'GIFT_WITH_PURCHASE',
          'MINIMUM_PURCHASE'
        ),
        allowNull: false,
      },
      // Discount Configuration
      discount_type: {
        type: Sequelize.ENUM('percentage', 'fixed', 'free_shipping', 'buy_x_get_y'),
        allowNull: false,
        defaultValue: 'percentage',
      },
      discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      max_discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      // BUY_X_GET_Y Configuration
      buy_quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      get_quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // GIFT_WITH_PURCHASE Configuration
      gift_product_ids: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        defaultValue: [],
      },
      // Validity Period
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      // Conditions
      min_order_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      min_quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      // Targeting
      applicable_to: {
        type: Sequelize.ENUM('products', 'categories', 'all_store', 'entire_platform'),
        defaultValue: 'products',
      },
      product_ids: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        defaultValue: [],
      },
      category_ids: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        defaultValue: [],
      },
      // Ownership
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'stores',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      // Display Settings
      badge_text: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      badge_color: {
        type: Sequelize.STRING(7),
        defaultValue: '#FF6B6B',
      },
      show_countdown: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      // Priority & Limits
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      usage_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      max_uses_per_user: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      // Status
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      // Admin Approval
      approval_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'approved',
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Statistics
      view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      click_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      conversion_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_revenue: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
      },
      // Metadata
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('campaigns', ['campaign_type']);
    await queryInterface.addIndex('campaigns', ['is_active']);
    await queryInterface.addIndex('campaigns', ['start_date', 'end_date']);
    await queryInterface.addIndex('campaigns', ['store_id']);
    await queryInterface.addIndex('campaigns', ['created_by']);
    await queryInterface.addIndex('campaigns', ['approval_status']);
    await queryInterface.addIndex('campaigns', ['priority']);
    
    // GIN indexes for array fields
    await queryInterface.addIndex('campaigns', ['product_ids'], {
      using: 'gin',
    });
    await queryInterface.addIndex('campaigns', ['category_ids'], {
      using: 'gin',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('campaigns');
    
    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_campaigns_campaign_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_campaigns_discount_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_campaigns_applicable_to";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_campaigns_approval_status";');
  },
};




