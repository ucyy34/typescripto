/**
 * Commission Transaction Model
 * Records commission calculations for each order
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CommissionTransaction = sequelize.define(
  'CommissionTransaction',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'orders',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      comment: 'Related order',
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      comment: 'Store that owns this transaction',
    },
    setting_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'commission_settings',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'Commission settings used for calculation',
    },
    // Transaction Amounts
    order_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total order amount',
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Commission rate applied (percentage or fixed)',
    },
    commission_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Commission amount taken by platform',
    },
    seller_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount that goes to seller',
    },
    platform_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount that stays with platform (same as commission_amount)',
    },
    // Status
    status: {
      type: DataTypes.ENUM(
        'pending',
        'calculated',
        'paid_to_seller',
        'refunded',
        'cancelled'
      ),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Commission transaction status',
    },
    // Payment Details
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When seller was paid',
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Payment method used for seller payout',
    },
    payment_reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Payment reference number',
    },
    payout_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Related seller payout batch ID',
    },
    // Metadata
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin notes',
    },
    calculated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When commission was calculated',
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When order was refunded',
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Refund amount if partial refund',
    },
  },
  {
    tableName: 'commission_transactions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['order_id'],
      },
      {
        fields: ['store_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['payout_id'],
      },
      {
        fields: ['calculated_at'],
      },
      {
        fields: ['paid_at'],
      },
    ],
  }
);

// Instance Methods

/**
 * Mark transaction as paid to seller
 * @param {string} paymentMethod
 * @param {string} paymentReference
 * @param {string} payoutId
 * @returns {Promise<boolean>}
 */
CommissionTransaction.prototype.markAsPaid = async function (
  paymentMethod,
  paymentReference,
  payoutId
) {
  this.status = 'paid_to_seller';
  this.paid_at = new Date();
  this.payment_method = paymentMethod;
  this.payment_reference = paymentReference;
  this.payout_id = payoutId;
  await this.save();
  return true;
};

/**
 * Mark transaction as refunded
 * @param {number} refundAmount - Full or partial refund amount
 * @returns {Promise<boolean>}
 */
CommissionTransaction.prototype.markAsRefunded = async function (refundAmount) {
  this.status = 'refunded';
  this.refunded_at = new Date();
  this.refund_amount = refundAmount || this.order_total;
  
  // Recalculate amounts for partial refund
  if (refundAmount && refundAmount < this.order_total) {
    const remainingAmount = this.order_total - refundAmount;
    const remainingCommission = remainingAmount * (this.commission_rate / 100);
    
    this.commission_amount = parseFloat(remainingCommission.toFixed(2));
    this.seller_amount = parseFloat((remainingAmount - remainingCommission).toFixed(2));
    this.platform_amount = this.commission_amount;
  } else {
    // Full refund - zero out amounts
    this.commission_amount = 0;
    this.seller_amount = 0;
    this.platform_amount = 0;
  }
  
  await this.save();
  return true;
};

/**
 * Calculate commission breakdown
 * @returns {Object}
 */
CommissionTransaction.prototype.getBreakdown = function () {
  return {
    order_total: parseFloat(this.order_total),
    commission_rate: parseFloat(this.commission_rate),
    commission_amount: parseFloat(this.commission_amount),
    seller_amount: parseFloat(this.seller_amount),
    platform_amount: parseFloat(this.platform_amount),
    commission_percentage: (
      (parseFloat(this.commission_amount) / parseFloat(this.order_total)) *
      100
    ).toFixed(2),
  };
};

// Class Methods

/**
 * Get store's commission summary for a period
 * @param {string} storeId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Object>}
 */
CommissionTransaction.getStoreSummary = async function (
  storeId,
  startDate,
  endDate
) {
  const { Op } = require('sequelize');

  const transactions = await this.findAll({
    where: {
      store_id: storeId,
      status: ['calculated', 'paid_to_seller'],
      calculated_at: {
        [Op.between]: [startDate, endDate],
      },
    },
  });

  const summary = {
    total_sales: 0,
    total_commission: 0,
    total_seller_amount: 0,
    transaction_count: transactions.length,
    average_commission_rate: 0,
  };

  transactions.forEach((t) => {
    summary.total_sales += parseFloat(t.order_total);
    summary.total_commission += parseFloat(t.commission_amount);
    summary.total_seller_amount += parseFloat(t.seller_amount);
  });

  if (summary.total_sales > 0) {
    summary.average_commission_rate = (
      (summary.total_commission / summary.total_sales) *
      100
    ).toFixed(2);
  }

  return summary;
};

/**
 * Get platform commission summary for a period
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Object>}
 */
CommissionTransaction.getPlatformSummary = async function (startDate, endDate) {
  const { Op } = require('sequelize');

  const transactions = await this.findAll({
    where: {
      status: ['calculated', 'paid_to_seller'],
      calculated_at: {
        [Op.between]: [startDate, endDate],
      },
    },
  });

  const summary = {
    total_sales: 0,
    total_commission: 0,
    total_paid_to_sellers: 0,
    pending_payments: 0,
    transaction_count: transactions.length,
    unique_stores: new Set(),
  };

  transactions.forEach((t) => {
    summary.total_sales += parseFloat(t.order_total);
    summary.total_commission += parseFloat(t.commission_amount);
    
    if (t.status === 'paid_to_seller') {
      summary.total_paid_to_sellers += parseFloat(t.seller_amount);
    } else {
      summary.pending_payments += parseFloat(t.seller_amount);
    }
    
    summary.unique_stores.add(t.store_id);
  });

  summary.unique_stores = summary.unique_stores.size;

  return summary;
};

// Hooks

/**
 * Validate amounts before save
 */
CommissionTransaction.beforeSave(async (transaction) => {
  // Ensure amounts are consistent
  const calculatedPlatformAmount = parseFloat(
    (transaction.order_total - transaction.seller_amount).toFixed(2)
  );

  if (Math.abs(calculatedPlatformAmount - transaction.platform_amount) > 0.01) {
    throw new Error('Commission amounts do not add up correctly');
  }

  // Validate seller amount
  if (transaction.seller_amount < 0) {
    throw new Error('Seller amount cannot be negative');
  }

  if (transaction.seller_amount > transaction.order_total) {
    throw new Error('Seller amount cannot exceed order total');
  }
});

module.exports = CommissionTransaction;










