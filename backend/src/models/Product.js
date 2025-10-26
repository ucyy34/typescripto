/**
 * Product Model
 * Represents products listed by stores
 */

const { DataTypes } = require('sequelize');
const slugify = require('slugify');
const { sequelize } = require('../config/sequelize');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    title: {
      type: DataTypes.STRING(300),
      allowNull: false,
      validate: {
        len: {
          args: [5, 300],
          msg: 'Product title must be between 5 and 300 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING(350),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    short_description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Stock Keeping Unit',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Price cannot be negative',
        },
      },
    },
    compare_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Original price for discount display',
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Cost to seller (not shown to buyers)',
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Stock cannot be negative',
        },
      },
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: 'Alert seller when stock reaches this level',
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Array of image URLs',
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Weight in kg for shipping calculation',
    },
    dimensions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Length, width, height in cm',
    },
    attributes: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Product-specific attributes (color, size, material, etc.)',
    },
    seo_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'SEO optimized title for search engines (50-60 chars)',
    },
    seo_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'SEO meta description for search engines (150-160 chars)',
    },
    meta_keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'SEO keywords for search engines',
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    badges: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Product badges like handmade, limited, eco-friendly, spiritual, traditional',
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.0,
      validate: {
        min: 0,
        max: 5,
      },
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_sales: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    views_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    tableName: 'products',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['store_id'],
      },
      {
        fields: ['category_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['is_featured'],
      },
      {
        fields: ['price'],
      },
      {
        fields: ['rating'],
      },
      {
        fields: ['total_sales'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

// Instance Methods

/**
 * Check if product is available for purchase
 * @returns {boolean}
 */
Product.prototype.isAvailable = function () {
  return this.is_active && this.status === 'approved' && this.stock > 0;
};

/**
 * Check if product is low on stock
 * @returns {boolean}
 */
Product.prototype.isLowStock = function () {
  return this.stock <= this.low_stock_threshold && this.stock > 0;
};

/**
 * Check if product is out of stock
 * @returns {boolean}
 */
Product.prototype.isOutOfStock = function () {
  return this.stock === 0;
};

/**
 * Calculate discount percentage
 * @returns {number|null}
 */
Product.prototype.getDiscountPercentage = function () {
  if (this.compare_price && this.compare_price > this.price) {
    return Math.round(((this.compare_price - this.price) / this.compare_price) * 100);
  }
  return null;
};

/**
 * Decrease stock after purchase
 * @param {number} quantity
 * @returns {Promise<boolean>}
 */
Product.prototype.decreaseStock = async function (quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    this.total_sales += quantity;
    await this.save();
    return true;
  }
  return false;
};

/**
 * Increase stock (returns, restocking)
 * @param {number} quantity
 */
Product.prototype.increaseStock = async function (quantity) {
  this.stock += quantity;
  await this.save();
};

/**
 * Increment views count
 */
Product.prototype.incrementViews = async function () {
  this.views_count += 1;
  await this.save({ silent: true }); // Don't update updated_at
};

/**
 * Update product rating
 * @param {number} newRating
 */
Product.prototype.updateRating = async function (newRating) {
  const totalRating = this.rating * this.total_reviews + newRating;
  this.total_reviews += 1;
  this.rating = (totalRating / this.total_reviews).toFixed(2);
  await this.save();
};

// Class Methods

/**
 * Find available products (approved, active, in stock)
 * @param {Object} options
 * @returns {Promise<Array<Product>>}
 */
Product.findAvailable = function (options = {}) {
  return this.findAll({
    where: {
      is_active: true,
      status: 'approved',
      stock: { [sequelize.Sequelize.Op.gt]: 0 },
    },
    ...options,
  });
};

/**
 * Find product by slug
 * @param {string} slug
 * @returns {Promise<Product|null>}
 */
Product.findBySlug = function (slug) {
  return this.findOne({ where: { slug } });
};

/**
 * Find featured products
 * @param {number} limit
 * @returns {Promise<Array<Product>>}
 */
Product.findFeatured = function (limit = 10) {
  return this.findAll({
    where: {
      is_featured: true,
      is_active: true,
      status: 'approved',
      stock: { [sequelize.Sequelize.Op.gt]: 0 },
    },
    order: [['total_sales', 'DESC']],
    limit,
  });
};

/**
 * Find best sellers
 * @param {number} limit
 * @returns {Promise<Array<Product>>}
 */
Product.findBestSellers = function (limit = 10) {
  return this.findAll({
    where: {
      is_active: true,
      status: 'approved',
      stock: { [sequelize.Sequelize.Op.gt]: 0 },
    },
    order: [['total_sales', 'DESC']],
    limit,
  });
};

/**
 * Search products by title
 * @param {string} query
 * @param {Object} options
 * @returns {Promise<Array<Product>>}
 */
Product.search = function (query, options = {}) {
  return this.findAll({
    where: {
      title: {
        [sequelize.Sequelize.Op.iLike]: `%${query}%`,
      },
      is_active: true,
      status: 'approved',
      stock: { [sequelize.Sequelize.Op.gt]: 0 },
    },
    ...options,
  });
};

// Hooks

/**
 * Generate slug before creating product
 */
Product.beforeCreate(async (product) => {
  if (!product.slug && product.title) {
    let slug = slugify(product.title, { lower: true, strict: true });

    // Ensure slug is unique
    const existing = await Product.findOne({ where: { slug } });
    if (existing) {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${randomSuffix}`;
    }

    product.slug = slug;
  }
});

/**
 * Update slug when title changes
 */
Product.beforeUpdate(async (product) => {
  if (product.changed('title')) {
    let slug = slugify(product.title, { lower: true, strict: true });

    // Ensure slug is unique
    const existing = await Product.findOne({
      where: {
        slug,
        id: { [sequelize.Sequelize.Op.ne]: product.id },
      },
    });

    if (existing) {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${randomSuffix}`;
    }

    product.slug = slug;
  }

  // Set approved_at when status changes to approved
  if (product.changed('status') && product.status === 'approved' && !product.approved_at) {
    product.approved_at = new Date();
  }
});

module.exports = Product;
