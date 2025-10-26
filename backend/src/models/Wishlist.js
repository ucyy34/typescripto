/**
 * Wishlist Model
 * Stores wishlist items for users or guest sessions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Wishlist = sequelize.define(
  'Wishlist',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    session_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
      comment: 'Express session identifier for guest wishlists',
    },
    items: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of wishlist entries { product_id, added_at }',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'wishlists',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['session_id'],
      },
    ],
  }
);

Wishlist.prototype.addItem = function addItem(productId) {
  const items = Array.isArray(this.items) ? [...this.items] : [];
  const exists = items.find((item) => item.product_id === productId);

  if (!exists) {
    items.push({ product_id: productId, added_at: new Date().toISOString() });
    this.items = items;
  }

  return this;
};

Wishlist.prototype.removeItem = function removeItem(productId) {
  if (!Array.isArray(this.items)) {
    this.items = [];
    return this;
  }

  this.items = this.items.filter((item) => item.product_id !== productId);
  return this;
};

Wishlist.prototype.clearItems = function clearItems() {
  this.items = [];
  return this;
};

Wishlist.findOrCreateForUser = async function findOrCreateForUser(userId) {
  const [wishlist] = await this.findOrCreate({
    where: { user_id: userId },
    defaults: { user_id: userId, items: [] },
  });

  return wishlist;
};

module.exports = Wishlist;
