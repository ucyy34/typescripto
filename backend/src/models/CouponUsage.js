/**
 * Coupon Usage Model
 * Track coupon usage by users
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CouponUsage = sequelize.define(
  'CouponUsage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    coupon_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'coupons',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Coupon that was used',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true, // Null for guest orders
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User who used the coupon',
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Order where coupon was applied',
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Actual discount amount applied',
    },
    order_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Order total before discount',
    },
    final_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Order total after discount',
    },
    used_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When coupon was used',
    },
  },
  {
    tableName: 'coupon_usages',
    timestamps: true,
    updatedAt: false, // No updates needed
    indexes: [
      {
        fields: ['coupon_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['order_id'],
      },
      {
        fields: ['used_at'],
      },
      {
        // Unique constraint for one coupon per order
        unique: true,
        fields: ['order_id', 'coupon_id'],
      },
    ],
  }
);

// Class Methods

/**
 * Get user's usage count for a coupon
 * @param {string} couponId
 * @param {string} userId
 * @returns {Promise<number>}
 */
CouponUsage.getUserUsageCount = async function (couponId, userId) {
  if (!userId) return 0;
  
  return this.count({
    where: {
      coupon_id: couponId,
      user_id: userId,
    },
  });
};

/**
 * Get total usage count for a coupon
 * @param {string} couponId
 * @returns {Promise<number>}
 */
CouponUsage.getTotalUsageCount = async function (couponId) {
  return this.count({
    where: {
      coupon_id: couponId,
    },
  });
};

/**
 * Get user's coupon history
 * @param {string} userId
 * @returns {Promise<Array<CouponUsage>>}
 */
CouponUsage.getUserHistory = function (userId) {
  return this.findAll({
    where: { user_id: userId },
    include: [
      {
        association: 'coupon',
        attributes: ['code', 'name', 'discount_type', 'discount_value'],
      },
    ],
    order: [['used_at', 'DESC']],
    limit: 50,
  });
};

module.exports = CouponUsage;








