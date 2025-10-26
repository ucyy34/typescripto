/**
 * Review Controller
 * Handles review-related HTTP requests
 */

const reviewService = require('../services/review.service');
const { success, created } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

const reviewController = {
  /**
   * Get reviews for a product
   */
  getProductReviews: asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    const result = await reviewService.getProductReviews(productId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
    });

    return success(res, result, 'Product reviews retrieved successfully');
  }),

  /**
   * Get reviews for a store
   */
  getStoreReviews: asyncHandler(async (req, res) => {
    const { storeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await reviewService.getStoreReviews(storeId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return success(res, result, 'Store reviews retrieved successfully');
  }),

  /**
   * Create a product review
   */
  createProductReview: asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;
    const reviewData = req.body;

    const review = await reviewService.createProductReview(userId, productId, reviewData);

    return created(res, review, 'Review created successfully');
  }),

  /**
   * Update a review
   */
  updateReview: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const review = await reviewService.updateReview(id, userId, updateData);

    return success(res, review, 'Review updated successfully');
  }),

  /**
   * Delete a review
   */
  deleteReview: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await reviewService.deleteReview(id, userId);

    return success(res, null, 'Review deleted successfully');
  }),

  /**
   * Mark review as helpful
   */
  markHelpful: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { helpful } = req.body; // true or false

    const review = await reviewService.markHelpful(id, userId, helpful);

    return success(res, review, 'Review feedback recorded');
  }),

  /**
   * Get pending reviews (Admin only)
   */
  getPendingReviews: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await reviewService.getPendingReviews({
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return success(res, result, 'Pending reviews retrieved successfully');
  }),

  /**
   * Approve a review (Admin only)
   */
  approveReview: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    const review = await reviewService.approveReview(id, adminId);

    return success(res, review, 'Review approved successfully');
  }),

  /**
   * Reject a review (Admin only)
   */
  rejectReview: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;

    const review = await reviewService.rejectReview(id, adminId, reason);

    return success(res, review, 'Review rejected successfully');
  }),
};

module.exports = reviewController;
