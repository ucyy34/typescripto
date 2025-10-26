/**
 * ProductVariant Model
 * Stores selected variants for each product
 * Example: A specific t-shirt product has "Size: M" and "Color: Blue"
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProductVariant = sequelize.define(
  'ProductVariant',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    category_variant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'category_variants',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      comment: 'Links to the variant type definition',
    },
    variant_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Cached variant name (e.g., "Color", "Size")',
    },
    selected_options: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of selected options. Example: [{"label": "Red", "value": "#FF0000"}] or [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}]',
    },
  },
  {
    tableName: 'product_variants',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['product_id'],
      },
      {
        fields: ['category_variant_id'],
      },
      {
        fields: ['product_id', 'category_variant_id'],
        unique: true,
        name: 'unique_product_variant',
      },
    ],
  }
);

module.exports = ProductVariant;
