/**
 * Review Service
 * Business logic for reviews and ratings
 */

import { Review, User, Product, Order, OrderItem } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';

interface ReviewOptions {
  page?: number;
  limit?: number;
  sort?: 'recent' | 'highest' | 'lowest' | 'helpful';
}

interface ReviewData {
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

interface ReviewUpdateData {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
}

interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

class ReviewService {
  /**
   * Get reviews for a product with pagination
   */
  async getProductReviews(productId: string, options: ReviewOptions = {}): Promise<any> {
    const { page = 1, limit = 10, sort = 'recent' } = options;
    const offset = (page - 1) * limit;

    // Determine sort order
    let order: any;
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
    const avgRating: any = await Review.findOne({
      where: {
        product_id: productId,
        status: 'approved'
      },
      attributes: [
        [(Review as any).sequelize.fn('AVG', (Review as any).sequelize.col('rating')), 'average'],
        [(Review as any).sequelize.fn('COUNT', (Review as any).sequelize.col('id')), 'total'],
      ],
      raw: true,
    });

    // Get rating distribution (only approved reviews)
    const ratingDistribution: any[] = await Review.findAll({
      where: {
        product_id: productId,
        status: 'approved'
      },
      attributes: [
        'rating',
        [(Review as any).sequelize.fn('COUNT', (Review as any).sequelize.col('id')), 'count'],
      ],
      group: ['rating'],
      raw: true,
    });

    const distribution: RatingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingDistribution.forEach((item: any) => {
      (distribution as any)[item.rating] = parseInt(item.count);
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
  async getStoreReviews(storeId: string, options: ReviewOptions = {}): Promise<any> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: {
        store_id: storeId,
        status: 'approved',
      },
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
  async createProductReview(userId: string, productId: string, reviewData: ReviewData): Promise<any> {
    // Check if product exists
    const product: any = await Product.findByPk(productId);
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
    const hasPurchased: any = await OrderItem.findOne({
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
    const review: any = await Review.create({
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
  async updateReview(reviewId: string, userId: string, updateData: ReviewUpdateData): Promise<any> {
    const review: any = await Review.findByPk(reviewId);

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
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review: any = await Review.findByPk(reviewId);

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
  async markHelpful(reviewId: string, userId: string, helpful: boolean): Promise<any> {
    const review: any = await Review.findByPk(reviewId);

    if (!review) {
      throw new ApiError('Review not found', StatusCodes.NOT_FOUND);
    }

    // In a real system, you'd track who marked what in a separate table
    // For now, just increment/decrement counters
    const isHelpful = Boolean(helpful);

    if (isHelpful) {
      review.helpful_count = (review.helpful_count || 0) + 1;
    } else if (Object.prototype.hasOwnProperty.call(review.get(), 'not_helpful_count')) {
      const current = review.get('not_helpful_count') || 0;
      review.set('not_helpful_count', current + 1);
    } else if (typeof review.helpful_count === 'number') {
      review.helpful_count = Math.max(0, review.helpful_count - 1);
    }

    await review.save();

    return review;
  }

  /**
   * Get pending reviews (Admin only)
   */
  async getPendingReviews(options: ReviewOptions = {}): Promise<any> {
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
  async approveReview(reviewId: string, adminId: string): Promise<any> {
    const review: any = await Review.findByPk(reviewId);

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
  async rejectReview(reviewId: string, adminId: string, reason: string): Promise<any> {
    const review: any = await Review.findByPk(reviewId);

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

export = new ReviewService();
