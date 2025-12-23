/**
 * ProductVariant Model (Redesigned)
 * Stores individual variant combinations for each product
 * Example: A t-shirt has variants like "Black-L", "Black-M", "White-L"
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

    // SKU - auto-generated or manual
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: 'SKU code for this variant (e.g., DC-2024-SYH-L)',
    },

    // Color (optional)
    color_hex: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Hex color code (e.g., #000000)',
    },
    color_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Color name (e.g., Siyah)',
    },

    // Variant Type & Value (using cascading dropdown)
    variant_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Variant type key (e.g., beden, boyut, agirlik)',
    },
    variant_value: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Selected value (e.g., L, 100g, Küçük)',
    },

    // Price & Stock
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Variant price',
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Variant stock quantity',
    },

    // Optional image
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional variant-specific image',
    },

    // Discount (optional)
    discount_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Discount percentage (e.g., 20.00 for 20%)',
    },
    discount_ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the discount expires',
    },

    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this variant is available for purchase',
    },

    // Legacy field - keep for backward compatibility
    category_variant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'category_variants',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'Legacy: Links to category variant (deprecated)',
    },
    variant_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Legacy: Cached variant name',
    },
    selected_options: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Legacy: Array of selected options',
    },
    // Note: price_override has been renamed to price in the new variant system
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
        fields: ['sku'],
        unique: true,
        name: 'unique_product_variant_sku',
      },
    ],
  }
);

module.exports = ProductVariant;
