/**
 * CategoryVariant Model
 * Defines available variant types for each category
 * Example: "Clothing" category has variants like "Size" and "Color"
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CategoryVariant = sequelize.define(
  'CategoryVariant',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Variant type name (e.g., "Size", "Color", "Material")',
    },
    type: {
      type: DataTypes.ENUM('color', 'text', 'image'),
      defaultValue: 'text',
      comment: 'How the variant should be displayed',
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of available options. For color: [{label: "Red", value: "#FF0000"}], for text: [{label: "Small", value: "S"}]',
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether vendor must select this variant when creating product',
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Display order',
    },
  },
  {
    tableName: 'category_variants',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['category_id'],
      },
      {
        fields: ['category_id', 'name'],
        unique: true,
        name: 'unique_category_variant_name',
      },
    ],
  }
);

module.exports = CategoryVariant;
