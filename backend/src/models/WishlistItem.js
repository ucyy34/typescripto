/**
 * Wishlist Item Model
 * Stores products saved by users for later
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const WishlistItem = sequelize.define(
  'WishlistItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
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
      onDelete: 'CASCADE',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Optional client-side metadata for display fallbacks',
    },
  },
  {
    tableName: 'wishlist_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'product_id'],
      },
      {
        fields: ['product_id'],
      },
    ],
  }
);

module.exports = WishlistItem;
