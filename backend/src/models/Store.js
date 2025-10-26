/**
 * Store Model
 * Represents seller stores in the marketplace
 */

const { DataTypes } = require('sequelize');
const slugify = require('slugify');
const { sequelize } = require('../config/sequelize');

const Store = sequelize.define(
  'Store',
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
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: {
          args: [3, 200],
          msg: 'Store name must be between 3 and 200 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    banner: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
      defaultValue: 'pending',
      allowNull: false,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'Turkey',
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    tax_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bank_account: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Bank account details for payouts',
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        allow_reviews: true,
        auto_accept_orders: false,
        minimum_order_amount: 0,
        shipping_fee: 0,
        free_shipping_threshold: 0,
      },
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
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: 'stores',
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['is_featured'],
      },
      {
        fields: ['rating'],
      },
    ],
  }
);

// Instance Methods

/**
 * Check if store is active
 * @returns {boolean}
 */
Store.prototype.isActive = function () {
  return this.status === 'approved';
};

/**
 * Get store's full address
 * @returns {string}
 */
Store.prototype.getFullAddress = function () {
  const parts = [this.address, this.city, this.postal_code, this.country].filter(Boolean);
  return parts.join(', ');
};

/**
 * Update rating
 * @param {number} newRating
 */
Store.prototype.updateRating = async function (newRating) {
  const totalRating = this.rating * this.total_reviews + newRating;
  this.total_reviews += 1;
  this.rating = (totalRating / this.total_reviews).toFixed(2);
  await this.save();
};

// Class Methods

/**
 * Find approved stores
 * @param {Object} options
 * @returns {Promise<Array<Store>>}
 */
Store.findApproved = function (options = {}) {
  return this.findAll({
    where: { status: 'approved' },
    ...options,
  });
};

/**
 * Find pending stores (for admin)
 * @param {Object} options
 * @returns {Promise<Array<Store>>}
 */
Store.findPending = function (options = {}) {
  return this.findAll({
    where: { status: 'pending' },
    order: [['created_at', 'ASC']],
    ...options,
  });
};

/**
 * Find store by slug
 * @param {string} slug
 * @returns {Promise<Store|null>}
 */
Store.findBySlug = function (slug) {
  return this.findOne({ where: { slug } });
};

// Hooks

/**
 * Generate slug before creating store
 */
Store.beforeCreate(async (store) => {
  if (!store.slug && store.name) {
    let slug = slugify(store.name, { lower: true, strict: true });

    // Check if slug exists, add suffix if needed
    const existingStore = await Store.findOne({ where: { slug } });
    if (existingStore) {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${randomSuffix}`;
    }

    store.slug = slug;
  }
});

/**
 * Update slug when name changes
 */
Store.beforeUpdate(async (store) => {
  if (store.changed('name')) {
    let slug = slugify(store.name, { lower: true, strict: true });

    // Ensure slug is unique
    const existingStore = await Store.findOne({
      where: {
        slug,
        id: { [sequelize.Sequelize.Op.ne]: store.id },
      },
    });

    if (existingStore) {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${randomSuffix}`;
    }

    store.slug = slug;
  }

  // Set approved_at when status changes to approved
  if (store.changed('status') && store.status === 'approved' && !store.approved_at) {
    store.approved_at = new Date();
  }
});

module.exports = Store;
