/**
 * Campaign Model
 * Marketing campaigns for products and categories
 * Can be created by both admin and vendors
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Campaign = sequelize.define(
  'Campaign',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Basic Info
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Campaign name (e.g., "Summer Flash Sale", "Buy 2 Get 1 Free")',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Campaign description shown to users',
    },
    // Campaign Type
    campaign_type: {
      type: DataTypes.ENUM(
        'FLASH_SALE',        // Flaş satış - belirli ürünlerde belirli süre indirim
        'BUY_X_GET_Y',       // X al Y öde (Buy 2 Get 1 Free, Buy 3 Pay for 2)
        'CATEGORY_DISCOUNT', // Kategori indirimi
        'FREE_SHIPPING',     // Ücretsiz kargo
        'BUNDLE_DEAL',       // Paket kampanya (birlikte al indirim kazan)
        'GIFT_WITH_PURCHASE',// Alışverişe hediye
        'MINIMUM_PURCHASE'   // Minimum alışverişe indirim
      ),
      allowNull: false,
      comment: 'Type of campaign',
    },
    // Discount Configuration
    discount_type: {
      type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping', 'buy_x_get_y'),
      allowNull: false,
      defaultValue: 'percentage',
      comment: 'How discount is calculated',
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Discount amount (percentage or fixed)',
    },
    max_discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Maximum discount for percentage campaigns',
    },
    // BUY_X_GET_Y Configuration
    buy_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'For BUY_X_GET_Y: number of items to buy (e.g., 2 for "Buy 2")',
    },
    get_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'For BUY_X_GET_Y: number of items to get (e.g., 1 for "Get 1 Free")',
    },
    // GIFT_WITH_PURCHASE Configuration
    gift_product_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Product IDs to give as gift',
    },
    // Validity Period
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Campaign start date',
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Campaign end date (required)',
    },
    // Conditions
    min_order_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Minimum order amount required',
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Minimum quantity of products required',
    },
    // Targeting
    applicable_to: {
      type: DataTypes.ENUM('products', 'categories', 'all_store', 'entire_platform'),
      defaultValue: 'products',
      comment: 'What this campaign applies to',
    },
    product_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Specific product IDs (if applicable_to = products)',
    },
    category_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Category IDs (if applicable_to = categories)',
    },
    // Ownership
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'User who created this campaign (admin or seller)',
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Store ID (null for admin/platform-wide campaigns)',
    },
    // Display Settings
    badge_text: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Badge text to show on products (e.g., "50% OFF", "2 al 1 öde")',
    },
    badge_color: {
      type: DataTypes.STRING(7),
      defaultValue: '#FF6B6B',
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
      comment: 'Badge background color (hex)',
    },
    show_countdown: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Show countdown timer on product page',
    },
    // Priority & Limits
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Campaign priority (higher = applied first when multiple campaigns)',
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total usage limit (null = unlimited)',
    },
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'How many times this campaign has been used',
    },
    max_uses_per_user: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Max uses per user',
    },
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Is campaign active',
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Show on homepage/campaign page',
    },
    // Admin Approval (for vendor campaigns)
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved',
      comment: 'Admin approval status (auto-approved for admin campaigns)',
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for rejection (if rejected)',
    },
    // Statistics
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'How many times campaign was viewed',
    },
    click_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'How many times campaign was clicked',
    },
    conversion_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'How many orders were completed with this campaign',
    },
    total_revenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: 'Total revenue generated by this campaign',
    },
    // Metadata
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes',
    },
  },
  {
    tableName: 'campaigns',
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['campaign_type'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['start_date', 'end_date'],
      },
      {
        fields: ['store_id'],
      },
      {
        fields: ['created_by'],
      },
      {
        fields: ['approval_status'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['product_ids'],
        using: 'gin',
      },
      {
        fields: ['category_ids'],
        using: 'gin',
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if campaign is currently active (time-wise)
 * @returns {boolean}
 */
Campaign.prototype.isActiveNow = function () {
  if (!this.is_active) return false;
  if (this.approval_status !== 'approved') return false;

  const now = new Date();
  return now >= this.start_date && now <= this.end_date;
};

/**
 * Check if campaign has reached usage limit
 * @returns {boolean}
 */
Campaign.prototype.hasReachedLimit = function () {
  if (!this.usage_limit) return false;
  return this.usage_count >= this.usage_limit;
};

/**
 * Calculate discount for given amount
 * @param {number} amount - Order/product amount
 * @param {number} quantity - Quantity of items
 * @returns {number} Discount amount
 */
Campaign.prototype.calculateDiscount = function (amount, quantity = 1) {
  let discount = 0;

  if (this.discount_type === 'percentage') {
    discount = amount * (parseFloat(this.discount_value) / 100);

    // Apply max discount limit
    if (this.max_discount_amount && discount > parseFloat(this.max_discount_amount)) {
      discount = parseFloat(this.max_discount_amount);
    }
  } else if (this.discount_type === 'fixed') {
    discount = parseFloat(this.discount_value);

    // Discount cannot exceed amount
    if (discount > amount) {
      discount = amount;
    }
  } else if (this.discount_type === 'buy_x_get_y') {
    // Calculate how many free items
    if (this.buy_quantity && this.get_quantity) {
      const sets = Math.floor(quantity / this.buy_quantity);
      const freeItems = sets * this.get_quantity;
      const pricePerItem = amount / quantity;
      discount = freeItems * pricePerItem;
    }
  }

  return parseFloat(discount.toFixed(2));
};

/**
 * Get display badge text
 * @returns {string}
 */
Campaign.prototype.getBadgeText = function () {
  if (this.badge_text) return this.badge_text;

  // Auto-generate based on campaign type
  switch (this.campaign_type) {
    case 'FLASH_SALE':
      if (this.discount_type === 'percentage') {
        return `%${this.discount_value} İNDİRİM`;
      } else if (this.discount_type === 'fixed') {
        return `₺${this.discount_value} İNDİRİM`;
      }
      break;
    case 'BUY_X_GET_Y':
      return `${this.buy_quantity} Al ${this.get_quantity} Öde`;
    case 'FREE_SHIPPING':
      return 'ÜCRETSİZ KARGO';
    case 'CATEGORY_DISCOUNT':
      return 'KAMPANYADA';
    case 'BUNDLE_DEAL':
      return 'PAKET İNDİRİMİ';
    case 'GIFT_WITH_PURCHASE':
      return 'HEDİYELİ';
    default:
      return 'KAMPANYA';
  }
  return 'KAMPANYA';
};

/**
 * Get time remaining in campaign
 * @returns {Object} { days, hours, minutes, seconds }
 */
Campaign.prototype.getTimeRemaining = function () {
  const now = new Date();
  const end = new Date(this.end_date);
  const diff = end - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
};

/**
 * Check if campaign applies to a product
 * @param {string} productId - Product UUID
 * @param {string} categoryId - Category UUID
 * @returns {boolean}
 */
Campaign.prototype.appliesToProduct = function (productId, categoryId) {
  if (this.applicable_to === 'entire_platform') return true;
  if (this.applicable_to === 'all_store') return true; // Store matching handled elsewhere

  if (this.applicable_to === 'products') {
    return this.product_ids.includes(productId);
  }

  if (this.applicable_to === 'categories') {
    return this.category_ids.includes(categoryId);
  }

  return false;
};

// ============================================
// CLASS METHODS
// ============================================

/**
 * Get active campaigns
 * @param {Object} filters - Filter options
 * @returns {Promise<Array<Campaign>>}
 */
Campaign.getActiveCampaigns = function (filters = {}) {
  const now = new Date();
  const where = {
    is_active: true,
    approval_status: 'approved',
    start_date: {
      [sequelize.Sequelize.Op.lte]: now,
    },
    end_date: {
      [sequelize.Sequelize.Op.gte]: now,
    },
  };

  if (filters.storeId) {
    where[sequelize.Sequelize.Op.or] = [
      { store_id: filters.storeId },
      { store_id: null, applicable_to: 'entire_platform' },
    ];
  }

  if (filters.productId) {
    where[sequelize.Sequelize.Op.or] = [
      { product_ids: { [sequelize.Sequelize.Op.contains]: [filters.productId] } },
      { applicable_to: 'entire_platform' },
      { applicable_to: 'all_store' },
    ];
  }

  return this.findAll({
    where,
    order: [['priority', 'DESC'], ['created_at', 'DESC']],
  });
};

/**
 * Get campaigns for a specific product
 * @param {string} productId
 * @param {string} categoryId
 * @param {string} storeId
 * @returns {Promise<Array<Campaign>>}
 */
Campaign.getCampaignsForProduct = async function (productId, categoryId, storeId) {
  const now = new Date();
  const { Op } = sequelize.Sequelize;

  const campaigns = await this.findAll({
    where: {
      is_active: true,
      approval_status: 'approved',
      start_date: { [Op.lte]: now },
      end_date: { [Op.gte]: now },
      [Op.or]: [
        // Platform-wide campaigns
        { applicable_to: 'entire_platform' },
        // Store-wide campaigns
        { applicable_to: 'all_store', store_id: storeId },
        // Specific product campaigns
        { applicable_to: 'products', product_ids: { [Op.contains]: [productId] } },
        // Category campaigns
        { applicable_to: 'categories', category_ids: { [Op.contains]: [categoryId] } },
      ],
    },
    order: [['priority', 'DESC']],
  });

  return campaigns;
};

// ============================================
// HOOKS
// ============================================

/**
 * Validate campaign configuration before save
 */
Campaign.beforeValidate((campaign) => {
  // Validate dates
  if (campaign.start_date && campaign.end_date) {
    if (new Date(campaign.start_date) >= new Date(campaign.end_date)) {
      throw new Error('End date must be after start date');
    }
  }

  // Validate BUY_X_GET_Y configuration
  if (campaign.campaign_type === 'BUY_X_GET_Y') {
    if (!campaign.buy_quantity || !campaign.get_quantity) {
      throw new Error('BUY_X_GET_Y campaigns require buy_quantity and get_quantity');
    }
    campaign.discount_type = 'buy_x_get_y';
  }

  // Validate GIFT_WITH_PURCHASE configuration
  if (campaign.campaign_type === 'GIFT_WITH_PURCHASE') {
    if (!campaign.gift_product_ids || campaign.gift_product_ids.length === 0) {
      throw new Error('GIFT_WITH_PURCHASE campaigns require at least one gift product');
    }
  }

  // Admin campaigns are auto-approved
  if (campaign.isNewRecord) {
    // Will be set by service based on user role
  }
});

/**
 * Validate discount value based on type
 */
Campaign.beforeSave((campaign) => {
  if (campaign.discount_type === 'percentage') {
    if (campaign.discount_value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }
  }

  if (campaign.discount_type === 'free_shipping') {
    campaign.discount_value = 0;
  }
});

module.exports = Campaign;




