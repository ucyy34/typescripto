/**
 * Review Service
 * Business logic for reviews and ratings
 */

const { Review, User, Product, Order, OrderItem } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');

class ReviewService {
  /**
   * Get reviews for a product with pagination
   */
  async getProductReviews(productId, options = {}) {
    const { page = 1, limit = 10, sort = 'recent' } = options;
    const offset = (page - 1) * limit;

    // Determine sort order
    let order;
    switch (sort) {
      case 'highest':
        order = [['rating', 'DESC'], ['created_at', 'DESC']];
        break;
      case 'lowest':
        order = [['rating', 'ASC'], ['created_at', 'DESC']];
        break;
      case 'helpful':
        order = [['helpful_count', 'DESC'], ['created_at', 'DESC']];
        break;
      default: // 'recent'
        order = [['created_at', 'DESC']];
    }

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { 
        product_id: productId,
        status: 'approved' // Only show approved reviews
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order,
      limit,
      offset,
    });

    // Calculate average rating (only approved reviews)
    const avgRating = await Review.findOne({
      where: { 
        product_id: productId,
        status: 'approved'
      },
      attributes: [
        [Review.sequelize.fn('AVG', Review.sequelize.col('rating')), 'average'],
        [Review.sequelize.fn('COUNT', Review.sequelize.col('id')), 'total'],
      ],
      raw: true,
    });

    // Get rating distribution (only approved reviews)
    const ratingDistribution = await Review.findAll({
      where: { 
        product_id: productId,
        status: 'approved'
      },
      attributes: [
        'rating',
        [Review.sequelize.fn('COUNT', Review.sequelize.col('id')), 'count'],
      ],
      group: ['rating'],
      raw: true,
    });

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingDistribution.forEach((item) => {
      distribution[item.rating] = parseInt(item.count);
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
      summary: {
        average_rating: avgRating?.average ? parseFloat(avgRating.average).toFixed(1) : 0,
        total_reviews: avgRating?.total || 0,
        distribution,
      },
    };
  }

  /**
   * Get reviews for a store
   */
  async getStoreReviews(storeId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { store_id: storeId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Create a product review
   */
  async createProductReview(userId, productId, reviewData) {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      where: {
        user_id: userId,
        product_id: productId,
      },
    });

    if (existingReview) {
      throw new ApiError('Bu ürün için zaten yorum yaptınız', StatusCodes.BAD_REQUEST);
    }

    // Check if user purchased this product - REQUIRED!
    const hasPurchased = await OrderItem.findOne({
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            user_id: userId,
            status: 'delivered', // Only delivered orders
          },
        },
      ],
      where: {
        product_id: productId,
      },
    });

    // Enforce purchase requirement
    if (!hasPurchased) {
      throw new ApiError(
        'Bu ürün için yorum yapabilmek için önce satın almanız ve siparişinizin teslim edilmiş olması gerekiyor',
        StatusCodes.FORBIDDEN
      );
    }

    // Create review (all reviews are verified purchases now)
    const review = await Review.create({
      user_id: userId,
      product_id: productId,
      store_id: product.store_id,
      order_id: hasPurchased.order_id,
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      images: reviewData.images || [],
      is_verified_purchase: true, // Always true now
      status: 'pending', // Requires admin approval
    });

    // Load user data
    await review.reload({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
    });

    return review;
  }

  /**
   * Update a review
   */
  async updateReview(reviewId, userId, updateData) {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new ApiError('Review not found', StatusCodes.NOT_FOUND);
    }

    // Check ownership
    if (review.user_id !== userId) {
      throw new ApiError('You can only update your own reviews', StatusCodes.FORBIDDEN);
    }

    // Update fields
    if (updateData.rating !== undefined) review.rating = updateData.rating;
    if (updateData.title !== undefined) review.title = updateData.title;
    if (updateData.comment !== undefined) review.comment = updateData.comment;
    if (updateData.images !== undefined) review.images = updateData.images;

    await review.save();

    return review;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId, userId) {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new ApiError('Review not found', StatusCodes.NOT_FOUND);
    }

    // Check ownership
    if (review.user_id !== userId) {
      throw new ApiError('You can only delete your own reviews', StatusCodes.FORBIDDEN);
    }

    await review.destroy();
  }

  /**
   * Mark review as helpful/not helpful
   */
  async markHelpful(reviewId, userId, helpful) {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new ApiError('Review not found', StatusCodes.NOT_FOUND);
    }

    // In a real system, you'd track who marked what in a separate table
    // For now, just increment/decrement counters
    if (helpful) {
      review.helpful_count = (review.helpful_count || 0) + 1;
    } else {
      review.not_helpful_count = (review.not_helpful_count || 0) + 1;
    }

    await review.save();

    return review;
  }

  /**
   * Get pending reviews (Admin only)
   */
  async getPendingReviews(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'slug'],
        },
      ],
      order: [['created_at', 'ASC']], // Oldest first
      limit,
      offset,
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Approve a review (Admin only)
   */
  async approveReview(reviewId, adminId) {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new ApiError('Review not found', StatusCodes.NOT_FOUND);
    }

    if (review.status === 'approved') {
      throw new ApiError('Review is already approved', StatusCodes.BAD_REQUEST);
    }

    review.status = 'approved';
    review.is_approved = true; // For backward compatibility
    await review.save();

    return review;
  }

  /**
   * Reject a review (Admin only)
   */
  async rejectReview(reviewId, adminId, reason) {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new ApiError('Review not found', StatusCodes.NOT_FOUND);
    }

    if (review.status === 'rejected') {
      throw new ApiError('Review is already rejected', StatusCodes.BAD_REQUEST);
    }

    review.status = 'rejected';
    review.is_approved = false; // For backward compatibility
    review.rejection_reason = reason;
    await review.save();

    return review;
  }
}

module.exports = new ReviewService();
