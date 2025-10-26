/**
 * Commission Settings Model
 * Defines commission rates and rules for stores
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CommissionSettings = sequelize.define(
  'CommissionSettings',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true, // null = global/default settings
      references: {
        model: 'stores',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Store ID - null for global settings',
    },
    commission_type: {
      type: DataTypes.ENUM('percentage', 'fixed', 'tiered', 'category_based'),
      defaultValue: 'percentage',
      allowNull: false,
      comment: 'Type of commission calculation',
    },
    default_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 15.00,
      allowNull: false,
      comment: 'Default commission rate (percentage or fixed amount)',
      validate: {
        min: 0,
        max: 100, // For percentage
      },
    },
    min_commission: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Minimum commission amount per transaction',
    },
    max_commission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Maximum commission amount per transaction',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this commission setting is active',
    },
    applied_from: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Start date for this commission setting',
    },
    applied_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End date for this commission setting',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin notes about this commission setting',
    },
  },
  {
    tableName: 'commission_settings',
    timestamps: true,
    indexes: [
      {
        fields: ['store_id'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['applied_from', 'applied_until'],
      },
    ],
  }
);

// Instance Methods

/**
 * Check if setting is currently valid
 * @returns {boolean}
 */
CommissionSettings.prototype.isValid = function () {
  if (!this.is_active) return false;
  
  const now = new Date();
  if (this.applied_from && now < this.applied_from) return false;
  if (this.applied_until && now > this.applied_until) return false;
  
  return true;
};

/**
 * Calculate commission for given amount
 * @param {number} amount - Transaction amount
 * @returns {number} Commission amount
 */
CommissionSettings.prototype.calculateCommission = function (amount) {
  let commission = 0;

  if (this.commission_type === 'percentage') {
    commission = amount * (this.default_rate / 100);
  } else if (this.commission_type === 'fixed') {
    commission = this.default_rate;
  }

  // Apply min/max constraints
  if (this.min_commission && commission < this.min_commission) {
    commission = this.min_commission;
  }
  if (this.max_commission && commission > this.max_commission) {
    commission = this.max_commission;
  }

  return parseFloat(commission.toFixed(2));
};

// Class Methods

/**
 * Get active commission settings for a store
 * @param {string} storeId - Store ID
 * @returns {Promise<CommissionSettings>}
 */
CommissionSettings.getActiveSettings = async function (storeId) {
  // First try to get store-specific settings
  let settings = await this.findOne({
    where: {
      store_id: storeId,
      is_active: true,
    },
    order: [['created_at', 'DESC']],
  });

  // If no store-specific settings, get global settings
  if (!settings) {
    settings = await this.findOne({
      where: {
        store_id: null,
        is_active: true,
      },
      order: [['created_at', 'DESC']],
    });
  }

  return settings;
};

/**
 * Create default global settings
 * @returns {Promise<CommissionSettings>}
 */
CommissionSettings.createDefaultSettings = async function () {
  return this.create({
    store_id: null,
    commission_type: 'percentage',
    default_rate: 15.00,
    min_commission: 5.00,
    max_commission: null,
    is_active: true,
    notes: 'Default global commission settings',
  });
};

// Hooks

/**
 * Validate settings before create/update
 */
CommissionSettings.beforeSave(async (settings) => {
  // Validate rate based on type
  if (settings.commission_type === 'percentage') {
    if (settings.default_rate < 0 || settings.default_rate > 100) {
      throw new Error('Percentage commission rate must be between 0 and 100');
    }
  }

  // Validate min/max
  if (settings.min_commission && settings.max_commission) {
    if (settings.min_commission > settings.max_commission) {
      throw new Error('Minimum commission cannot be greater than maximum');
    }
  }

  // Validate dates
  if (settings.applied_from && settings.applied_until) {
    if (settings.applied_from > settings.applied_until) {
      throw new Error('Start date cannot be after end date');
    }
  }
});

module.exports = CommissionSettings;










