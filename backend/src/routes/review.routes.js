/**
 * Review Routes
 * Endpoints for product reviews and ratings
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validate, validateQuery, validateParams } = require('../middlewares/validate');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  reviewQuerySchema,
  reviewModerationQuerySchema,
  productReviewParamsSchema,
  storeReviewParamsSchema,
  reviewDecisionSchema,
  markHelpfulSchema,
} = require('../validators/review.validator');

// Public routes
router.get(
  '/products/:productId/reviews',
  validateParams(productReviewParamsSchema),
  validateQuery(reviewQuerySchema),
  reviewController.getProductReviews
);
router.get(
  '/stores/:storeId/reviews',
  validateParams(storeReviewParamsSchema),
  validateQuery(reviewQuerySchema),
  reviewController.getStoreReviews
);

// Protected routes (require authentication)
router.post(
  '/products/:productId/reviews',
  authenticate,
  validateParams(productReviewParamsSchema),
  validate(createReviewSchema),
  reviewController.createProductReview
);

router.put(
  '/reviews/:id',
  authenticate,
  validateParams(reviewIdSchema),
  validate(updateReviewSchema),
  reviewController.updateReview
);

router.delete(
  '/reviews/:id',
  authenticate,
  validateParams(reviewIdSchema),
  reviewController.deleteReview
);

// Helpful/Not helpful
router.post(
  '/reviews/:id/helpful',
  authenticate,
  validateParams(reviewIdSchema),
  validate(markHelpfulSchema),
  reviewController.markHelpful
);

// Admin routes (require admin role)
router.get(
  '/admin/reviews/pending',
  authenticate,
  requireAdmin,
  validateQuery(reviewModerationQuerySchema),
  reviewController.getPendingReviews
);
router.post(
  '/admin/reviews/:id/approve',
  authenticate,
  requireAdmin,
  validateParams(reviewIdSchema),
  reviewController.approveReview
);
router.post(
  '/admin/reviews/:id/reject',
  authenticate,
  requireAdmin,
  validateParams(reviewIdSchema),
  validate(reviewDecisionSchema),
  reviewController.rejectReview
);

module.exports = router;
