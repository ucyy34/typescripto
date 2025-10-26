/**
 * Cart Model
 * Shopping cart for logged-in users
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Cart = sequelize.define(
  'Cart',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    items: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of cart items with product_id, quantity, etc.',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'carts',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    updatedAt: 'updated_at',
    createdAt: false,
    deletedAt: 'deleted_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id'],
      },
    ],
  }
);

// Instance Methods

/**
 * Add item to cart
 * @param {string} productId
 * @param {number} quantity
 */
Cart.prototype.addItem = function (productId, quantity = 1) {
  const items = this.items || [];
  const existingItem = items.find((item) => item.product_id === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    items.push({ product_id: productId, quantity });
  }

  this.items = items;
  return this;
};

/**
 * Update item quantity
 * @param {string} productId
 * @param {number} quantity
 */
Cart.prototype.updateItem = function (productId, quantity) {
  const items = this.items || [];
  const item = items.find((i) => i.product_id === productId);

  if (item) {
    if (quantity <= 0) {
      this.items = items.filter((i) => i.product_id !== productId);
    } else {
      item.quantity = quantity;
      this.items = items;
    }
  }

  return this;
};

/**
 * Remove item from cart
 * @param {string} productId
 */
Cart.prototype.removeItem = function (productId) {
  this.items = (this.items || []).filter((item) => item.product_id !== productId);
  return this;
};

/**
 * Clear cart
 */
Cart.prototype.clearCart = function () {
  this.items = [];
  return this;
};

/**
 * Get cart item count
 * @returns {number}
 */
Cart.prototype.getItemCount = function () {
  return (this.items || []).reduce((total, item) => total + item.quantity, 0);
};

// Class Methods

/**
 * Find or create cart for user
 * @param {string} userId
 * @returns {Promise<Cart>}
 */
Cart.findOrCreateForUser = async function (userId) {
  const [cart] = await this.findOrCreate({
    where: { user_id: userId },
    defaults: { user_id: userId, items: [] },
  });
  return cart;
};

module.exports = Cart;
