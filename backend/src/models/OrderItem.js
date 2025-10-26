/**
 * OrderItem Model
 * Individual items within an order
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    product_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Product details at time of purchase (title, image, etc.)',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Quantity must be at least 1',
        },
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price at time of purchase',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'price * quantity',
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'order_items',
    indexes: [
      {
        fields: ['order_id'],
      },
      {
        fields: ['product_id'],
      },
    ],
  }
);

// Instance Methods

/**
 * Calculate item totals
 */
OrderItem.prototype.calculateTotals = function () {
  this.subtotal = this.price * this.quantity;
  this.total = this.subtotal + this.tax - this.discount;
};

// Hooks

/**
 * Auto-calculate totals before saving
 */
OrderItem.beforeSave(async (orderItem) => {
  orderItem.calculateTotals();
});

module.exports = OrderItem;
