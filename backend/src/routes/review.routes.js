/**
 * Review Routes
 * Endpoints for product reviews and ratings
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');
// const { validateRequest } = require('../middlewares/validation'); // TODO: Create validation middleware
// const reviewValidator = require('../validators/review.validator'); // TODO: Create validators

// Public routes
router.get('/products/:productId/reviews', reviewController.getProductReviews);
router.get('/stores/:storeId/reviews', reviewController.getStoreReviews);

// Protected routes (require authentication)
router.post(
  '/products/:productId/reviews',
  authenticate,
  // validateRequest(reviewValidator.createReviewSchema), // TODO: Add validation
  reviewController.createProductReview
);

router.put(
  '/reviews/:id',
  authenticate,
  // validateRequest(reviewValidator.updateReviewSchema), // TODO: Add validation
  reviewController.updateReview
);

router.delete('/reviews/:id', authenticate, reviewController.deleteReview);

// Helpful/Not helpful
router.post('/reviews/:id/helpful', authenticate, reviewController.markHelpful);

// Admin routes (require admin role)
router.get('/admin/reviews/pending', authenticate, requireAdmin, reviewController.getPendingReviews);
router.post('/admin/reviews/:id/approve', authenticate, requireAdmin, reviewController.approveReview);
router.post('/admin/reviews/:id/reject', authenticate, requireAdmin, reviewController.rejectReview);

module.exports = router;
