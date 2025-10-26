/**
 * Review Routes
 * Endpoints for product reviews and ratings
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validate, validateParams } = require('../middlewares/validate');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  productReviewParamSchema,
  storeReviewParamSchema,
  markHelpfulSchema,
  reviewModerationSchema,
} = require('../validators/review.validator');

// Public routes
router.get(
  '/products/:productId/reviews',
  validateParams(productReviewParamSchema),
  reviewController.getProductReviews
);
router.get(
  '/stores/:storeId/reviews',
  validateParams(storeReviewParamSchema),
  reviewController.getStoreReviews
);

// Protected routes (require authentication)
router.post(
  '/products/:productId/reviews',
  authenticate,
  validateParams(productReviewParamSchema),
  validate(createReviewSchema),
  reviewController.createProductReview
);

router.put(
  '/reviews/:id',
  authenticate,
  validateParams(reviewIdParamSchema),
  validate(updateReviewSchema),
  reviewController.updateReview
);

router.delete(
  '/reviews/:id',
  authenticate,
  validateParams(reviewIdParamSchema),
  reviewController.deleteReview
);

// Helpful/Not helpful
router.post(
  '/reviews/:id/helpful',
  authenticate,
  validateParams(reviewIdParamSchema),
  validate(markHelpfulSchema),
  reviewController.markHelpful
);

// Admin routes (require admin role)
router.get(
  '/admin/reviews/pending',
  authenticate,
  requireAdmin,
  reviewController.getPendingReviews
);
router.post(
  '/admin/reviews/:id/approve',
  authenticate,
  requireAdmin,
  validateParams(reviewIdParamSchema),
  reviewController.approveReview
);
router.post(
  '/admin/reviews/:id/reject',
  authenticate,
  requireAdmin,
  validateParams(reviewIdParamSchema),
  validate(reviewModerationSchema),
  reviewController.rejectReview
);

module.exports = router;
