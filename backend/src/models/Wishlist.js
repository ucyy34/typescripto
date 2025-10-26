/**
 * Wishlist Model
 * Stores products favourited by a user
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
  },
  {
    tableName: 'wishlists',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'product_id'],
        name: 'wishlists_user_product_unique',
      },
    ],
  }
);

module.exports = Wishlist;
