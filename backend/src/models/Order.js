/**
 * Order Model
 * Represents customer orders with FSM (Finite State Machine) pattern
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Human-readable order number (e.g., ORD-2024-00001)',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true, // Allow guest checkout
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User ID - null for guest orders',
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      comment: 'Each order belongs to one store',
    },
    status: {
      type: DataTypes.ENUM(
        'pending_payment',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ),
      defaultValue: 'pending_payment',
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'credit_card, bank_transfer, cash_on_delivery',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    shipping_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Total discount (coupons + other discounts)',
    },
    coupon_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Applied coupon code',
    },
    coupon_discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Discount from coupon',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'TRY',
    },
    shipping_address: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Full shipping address object',
    },
    billing_address: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    customer_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seller_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tracking_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    carrier: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Shipping carrier (e.g., Aras Kargo, MNG)',
    },
    payment_transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    payment_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Payment gateway response data',
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    shipped_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    // Shipping Support Breakdown (internal tracking)
    shipping_actual_cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Actual shipping cost (hidden from customer)',
    },
    shipping_customer_paid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Amount customer paid as "shipping support"',
    },
    shipping_store_covered: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Amount covered by store',
    },
    shipping_platform_covered: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Amount covered by platform',
    },
    shipping_rule_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Applied shipping support rule ID',
    },
    shipping_store_owes_platform: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: 'Amount store owes platform for shipping coverage (charged back)',
    },
  },
  {
    tableName: 'orders',
    indexes: [
      {
        unique: true,
        fields: ['order_number'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['store_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['payment_status'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

// Order Status State Machine
const ORDER_STATUS_TRANSITIONS = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

// Instance Methods

/**
 * Check if status transition is valid
 * @param {string} newStatus
 * @returns {boolean}
 */
Order.prototype.canTransitionTo = function (newStatus) {
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[this.status] || [];
  return allowedTransitions.includes(newStatus);
};

/**
 * Transition to new status with validation
 * @param {string} newStatus
 * @param {Object} metadata - Additional data for the transition
 * @returns {Promise<boolean>}
 */
Order.prototype.transitionTo = async function (newStatus, metadata = {}) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }

  this.status = newStatus;

  // Update timestamp fields based on status
  const now = new Date();
  switch (newStatus) {
    case 'paid':
      this.paid_at = now;
      this.payment_status = 'paid';
      if (metadata.transaction_id) {
        this.payment_transaction_id = metadata.transaction_id;
      }
      break;
    case 'shipped':
      this.shipped_at = now;
      if (metadata.tracking_number) {
        this.tracking_number = metadata.tracking_number;
      }
      if (metadata.carrier) {
        this.carrier = metadata.carrier;
      }
      break;
    case 'delivered':
      this.delivered_at = now;
      break;
    case 'cancelled':
      this.cancelled_at = now;
      if (metadata.reason) {
        this.cancellation_reason = metadata.reason;
      }
      break;
    case 'refunded':
      this.payment_status = 'refunded';
      break;
  }

  await this.save();
  return true;
};

/**
 * Calculate total from items
 * @param {Array} items - Order items
 */
Order.prototype.calculateTotal = function (items) {
  this.subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  this.total = this.subtotal + this.shipping_fee + this.tax - this.discount;
};

/**
 * Check if order is cancellable
 * @returns {boolean}
 */
Order.prototype.isCancellable = function () {
  return ['pending_payment', 'paid', 'processing'].includes(this.status);
};

/**
 * Check if order is refundable
 * @returns {boolean}
 */
Order.prototype.isRefundable = function () {
  return ['paid', 'delivered'].includes(this.status) && this.payment_status === 'paid';
};

// Class Methods

/**
 * Generate unique order number
 * @returns {Promise<string>}
 */
Order.generateOrderNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;

  // Find last order number for this year
  const lastOrder = await this.findOne({
    where: {
      order_number: {
        [sequelize.Sequelize.Op.like]: `${prefix}%`,
      },
    },
    order: [['created_at', 'DESC']],
  });

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.order_number.split('-').pop(), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Find orders by user
 * @param {string} userId
 * @param {Object} options
 * @returns {Promise<Array<Order>>}
 */
Order.findByUser = function (userId, options = {}) {
  return this.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    ...options,
  });
};

/**
 * Find orders by store
 * @param {string} storeId
 * @param {Object} options
 * @returns {Promise<Array<Order>>}
 */
Order.findByStore = function (storeId, options = {}) {
  return this.findAll({
    where: { store_id: storeId },
    order: [['created_at', 'DESC']],
    ...options,
  });
};

/**
 * Find orders by status
 * @param {string} status
 * @param {Object} options
 * @returns {Promise<Array<Order>>}
 */
Order.findByStatus = function (status, options = {}) {
  return this.findAll({
    where: { status },
    order: [['created_at', 'DESC']],
    ...options,
  });
};

// Hooks

/**
 * Generate order number before creating
 */
Order.beforeCreate(async (order) => {
  if (!order.order_number) {
    order.order_number = await Order.generateOrderNumber();
  }
});

/**
 * Validate status transitions before update
 */
Order.beforeUpdate(async (order) => {
  if (order.changed('status')) {
    const oldStatus = order._previousDataValues.status;
    const newStatus = order.status;

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[oldStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }
  }
});

module.exports = Order;
