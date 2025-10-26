/**
 * Review Model
 * Product and store reviews/ratings
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Review = sequelize.define(
  'Review',
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
      allowNull: true,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Rating must be at least 1',
        },
        max: {
          args: [5],
          msg: 'Rating cannot exceed 5',
        },
      },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Review images uploaded by user',
    },
    is_verified_purchase: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Review moderation status',
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Deprecated: Use status field instead',
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin reason for rejecting the review',
    },
    helpful_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of users who found this review helpful',
    },
    seller_response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seller_response_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'reviews',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['product_id'],
      },
      {
        fields: ['store_id'],
      },
      {
        fields: ['order_id'],
      },
      {
        fields: ['rating'],
      },
      {
        fields: ['is_approved'],
      },
      {
        fields: ['created_at'],
      },
    ],
    validate: {
      // Either product_id or store_id must be set, but not both
      hasTarget() {
        if (!this.product_id && !this.store_id) {
          throw new Error('Review must be for either a product or a store');
        }
        if (this.product_id && this.store_id) {
          throw new Error('Review cannot be for both product and store');
        }
      },
    },
  }
);

// Instance Methods

/**
 * Check if review is for a product
 * @returns {boolean}
 */
Review.prototype.isProductReview = function () {
  return this.product_id !== null;
};

/**
 * Check if review is for a store
 * @returns {boolean}
 */
Review.prototype.isStoreReview = function () {
  return this.store_id !== null;
};

/**
 * Add seller response
 * @param {string} response
 */
Review.prototype.addSellerResponse = async function (response) {
  this.seller_response = response;
  this.seller_response_at = new Date();
  await this.save();
};

/**
 * Mark as helpful
 */
Review.prototype.markAsHelpful = async function () {
  this.helpful_count += 1;
  await this.save();
};

// Class Methods

/**
 * Find reviews for a product
 * @param {string} productId
 * @param {Object} options
 * @returns {Promise<Array<Review>>}
 */
Review.findForProduct = function (productId, options = {}) {
  return this.findAll({
    where: {
      product_id: productId,
      is_approved: true,
    },
    order: [['created_at', 'DESC']],
    ...options,
  });
};

/**
 * Find reviews for a store
 * @param {string} storeId
 * @param {Object} options
 * @returns {Promise<Array<Review>>}
 */
Review.findForStore = function (storeId, options = {}) {
  return this.findAll({
    where: {
      store_id: storeId,
      is_approved: true,
    },
    order: [['created_at', 'DESC']],
    ...options,
  });
};

/**
 * Get average rating for product
 * @param {string} productId
 * @returns {Promise<number>}
 */
Review.getAverageRatingForProduct = async function (productId) {
  const result = await this.findAll({
    where: { product_id: productId, is_approved: true },
    attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
    raw: true,
  });

  return result[0]?.avg_rating ? parseFloat(result[0].avg_rating).toFixed(2) : 0;
};

/**
 * Get average rating for store
 * @param {string} storeId
 * @returns {Promise<number>}
 */
Review.getAverageRatingForStore = async function (storeId) {
  const result = await this.findAll({
    where: { store_id: storeId, is_approved: true },
    attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
    raw: true,
  });

  return result[0]?.avg_rating ? parseFloat(result[0].avg_rating).toFixed(2) : 0;
};

module.exports = Review;
