/**
 * Coupon Model
 * Discount coupons for orders
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Coupon = sequelize.define(
  'Coupon',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [3, 50],
          msg: 'Coupon code must be between 3 and 50 characters',
        },
        isUppercase: true,
      },
      comment: 'Unique coupon code (e.g., SUMMER2024, WELCOME10)',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Human-readable name for admin',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description shown to users',
    },
    // Discount Configuration
    discount_type: {
      type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping'),
      allowNull: false,
      defaultValue: 'percentage',
      comment: 'Type of discount',
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: 'Discount amount (percentage or fixed amount)',
    },
    max_discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Maximum discount for percentage coupons',
    },
    // Usage Limits
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total usage limit (null = unlimited)',
    },
    usage_limit_per_user: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'How many times one user can use this coupon',
    },
    times_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'How many times this coupon has been used',
    },
    // Validity Period
    valid_from: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Start date',
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End date (null = no expiry)',
    },
    // Conditions
    min_order_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Minimum order amount required',
    },
    applicable_to: {
      type: DataTypes.ENUM('all', 'products', 'categories', 'stores'),
      defaultValue: 'all',
      comment: 'What this coupon applies to',
    },
    applicable_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Product/Category/Store IDs if applicable',
    },
    first_order_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Only valid for first order',
    },
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Is this coupon active',
    },
    // Metadata
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'Admin who created this coupon',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin notes',
    },
  },
  {
    tableName: 'coupons',
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        unique: true,
        fields: ['code'],
        where: {
          deleted_at: null,
        },
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['valid_from', 'valid_until'],
      },
      {
        fields: ['discount_type'],
      },
    ],
  }
);

// Instance Methods

/**
 * Check if coupon is currently valid (time-wise)
 * @returns {boolean}
 */
Coupon.prototype.isValidNow = function () {
  const now = new Date();
  
  if (this.valid_from && now < this.valid_from) {
    return false;
  }
  
  if (this.valid_until && now > this.valid_until) {
    return false;
  }
  
  return true;
};

/**
 * Check if coupon has reached usage limit
 * @returns {boolean}
 */
Coupon.prototype.hasReachedLimit = function () {
  if (!this.usage_limit) {
    return false; // Unlimited
  }
  
  return this.times_used >= this.usage_limit;
};

/**
 * Check if coupon can be applied
 * @param {Object} options - Validation options
 * @returns {Object} { valid: boolean, error: string }
 */
Coupon.prototype.canBeApplied = function (options = {}) {
  const { orderAmount = 0, userId = null, userOrderCount = 0 } = options;

  // Check if active
  if (!this.is_active) {
    return { valid: false, error: 'Coupon is not active' };
  }

  // Check validity period
  if (!this.isValidNow()) {
    return { valid: false, error: 'Coupon is expired or not yet valid' };
  }

  // Check usage limit
  if (this.hasReachedLimit()) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }

  // Check minimum order amount
  if (orderAmount < parseFloat(this.min_order_amount)) {
    return {
      valid: false,
      error: `Minimum order amount is ₺${this.min_order_amount}`,
    };
  }

  // Check first order only
  if (this.first_order_only && userOrderCount > 0) {
    return { valid: false, error: 'This coupon is only for first orders' };
  }

  return { valid: true };
};

/**
 * Calculate discount amount
 * @param {number} orderAmount - Order total
 * @returns {number} Discount amount
 */
Coupon.prototype.calculateDiscount = function (orderAmount) {
  let discount = 0;

  if (this.discount_type === 'percentage') {
    discount = orderAmount * (parseFloat(this.discount_value) / 100);
    
    // Apply max discount limit
    if (this.max_discount_amount && discount > parseFloat(this.max_discount_amount)) {
      discount = parseFloat(this.max_discount_amount);
    }
  } else if (this.discount_type === 'fixed') {
    discount = parseFloat(this.discount_value);
    
    // Discount cannot exceed order amount
    if (discount > orderAmount) {
      discount = orderAmount;
    }
  }

  return parseFloat(discount.toFixed(2));
};

/**
 * Get display text for coupon
 * @returns {string}
 */
Coupon.prototype.getDisplayText = function () {
  if (this.discount_type === 'percentage') {
    let text = `${this.discount_value}% OFF`;
    if (this.max_discount_amount) {
      text += ` (Max ₺${this.max_discount_amount})`;
    }
    return text;
  } else if (this.discount_type === 'fixed') {
    return `₺${this.discount_value} OFF`;
  } else if (this.discount_type === 'free_shipping') {
    return 'FREE SHIPPING';
  }
  return '';
};

// Class Methods

/**
 * Find coupon by code
 * @param {string} code - Coupon code
 * @returns {Promise<Coupon|null>}
 */
Coupon.findByCode = function (code) {
  return this.findOne({
    where: {
      code: code.toUpperCase(),
    },
  });
};

/**
 * Get active coupons
 * @returns {Promise<Array<Coupon>>}
 */
Coupon.getActiveCoupons = function () {
  const now = new Date();
  
  return this.findAll({
    where: {
      is_active: true,
      valid_from: {
        [sequelize.Sequelize.Op.lte]: now,
      },
      [sequelize.Sequelize.Op.or]: [
        { valid_until: null },
        { valid_until: { [sequelize.Sequelize.Op.gte]: now } },
      ],
    },
    order: [['created_at', 'DESC']],
  });
};

/**
 * Get coupons available for user
 * @param {string} userId
 * @returns {Promise<Array<Coupon>>}
 */
Coupon.getAvailableForUser = async function (userId) {
  const activeCoupons = await this.getActiveCoupons();
  
  // Filter based on usage limits per user
  // This would need CouponUsage model for full implementation
  return activeCoupons.filter(coupon => !coupon.hasReachedLimit());
};

// Hooks

/**
 * Ensure code is uppercase before save
 */
Coupon.beforeValidate((coupon) => {
  if (coupon.code) {
    coupon.code = coupon.code.toUpperCase().trim();
  }
});

/**
 * Validate discount value based on type
 */
Coupon.beforeSave((coupon) => {
  if (coupon.discount_type === 'percentage') {
    if (coupon.discount_value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }
  }
  
  if (coupon.discount_type === 'free_shipping') {
    coupon.discount_value = 0; // Free shipping has no value
  }

  // Validate dates
  if (coupon.valid_from && coupon.valid_until) {
    if (coupon.valid_from > coupon.valid_until) {
      throw new Error('Start date cannot be after end date');
    }
  }
});

module.exports = Coupon;
