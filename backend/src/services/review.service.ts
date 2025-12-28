/**
 * Review Service
 * Business logic for reviews and ratings
 */

import { Review, User, Product, Order, OrderItem } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import type ReviewModel from '../models/Review';
import type ProductModel from '../models/Product';
import type OrderItemModel from '../models/OrderItem';

interface ReviewOptions {
  page?: number | string;
  limit?: number | string;
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

interface ReviewSummary {
  average_rating: string | number;
  total_reviews: number;
  distribution: RatingDistribution;
}

interface ReviewListResponse {
  reviews: ReviewModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary?: ReviewSummary;
}

class ReviewService {
  /**
   * Get reviews for a product with pagination
   */
  async getProductReviews(productId: string, options: ReviewOptions = {}): Promise<ReviewListResponse> {
    const { page = 1, limit = 10, sort = 'recent' } = options;
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    // Determine sort order
    let order: Array<[string, 'ASC' | 'DESC']>;
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
      limit: parsedLimit,
      offset,
    });

    // Calculate average rating (only approved reviews)
    const avgRating = (await Review.findOne({
      where: {
        product_id: productId,
        status: 'approved'
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'average'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      ],
      raw: true,
    })) as { average?: string | number; total?: string | number } | null;

    // Get rating distribution (only approved reviews)
    const ratingDistribution = (await Review.findAll({
      where: {
        product_id: productId,
        status: 'approved'
      },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['rating'],
      raw: true,
    })) as Array<{ rating: number; count: string | number }>;

    const distribution: RatingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingDistribution.forEach((item) => {
      const ratingKey = item.rating as keyof RatingDistribution;
      if (distribution[ratingKey] !== undefined) {
        distribution[ratingKey] = parseInt(String(item.count), 10);
      }
    });

    return {
      reviews,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        pages: Math.ceil(count / parsedLimit),
      },
      summary: {
        average_rating: avgRating?.average ? parseFloat(avgRating.average).toFixed(1) : 0,
        total_reviews: Number(avgRating?.total || 0),
        distribution,
      },
    };
  }

  /**
   * Get reviews for a store
   */
  async getStoreReviews(storeId: string, options: ReviewOptions = {}): Promise<ReviewListResponse> {
    const { page = 1, limit = 10 } = options;
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

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
      limit: parsedLimit,
      offset,
    });

    return {
      reviews,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        pages: Math.ceil(count / parsedLimit),
      },
    };
  }

  /**
   * Create a product review
   */
  async createProductReview(userId: string, productId: string, reviewData: ReviewData): Promise<ReviewModel> {
    // Check if product exists
    const product: ProductModel | null = await Product.findByPk(productId);
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
    const hasPurchased: OrderItemModel | null = await OrderItem.findOne({
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
    const review: ReviewModel = await Review.create({
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
  async updateReview(reviewId: string, userId: string, updateData: ReviewUpdateData): Promise<ReviewModel> {
    const review: ReviewModel | null = await Review.findByPk(reviewId);

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
    const review: ReviewModel | null = await Review.findByPk(reviewId);

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
  async markHelpful(reviewId: string, userId: string, helpful: boolean): Promise<ReviewModel> {
    const review: ReviewModel | null = await Review.findByPk(reviewId);

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
  async getPendingReviews(options: ReviewOptions = {}): Promise<ReviewListResponse> {
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
  async approveReview(reviewId: string, adminId: string): Promise<ReviewModel> {
    const review: ReviewModel | null = await Review.findByPk(reviewId);

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
  async rejectReview(reviewId: string, adminId: string, reason: string): Promise<ReviewModel> {
    const review: ReviewModel | null = await Review.findByPk(reviewId);

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
