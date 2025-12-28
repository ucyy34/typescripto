/**
 * Review Routes
 * Endpoints for product reviews and ratings
 */

import { Router } from 'express';

import reviewController from '../controllers/review.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate, validateQuery, validateParams } from '../middlewares/validate';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewFeedbackSchema,
  productReviewParamsSchema,
  storeReviewParamsSchema,
  reviewIdParamSchema,
  productReviewQuerySchema,
  storeReviewQuerySchema,
  pendingReviewQuerySchema,
  reviewModerationSchema,
  reviewApprovalSchema,
} from '../validators/review.validator';

const router: Router = Router();

// Public routes
router.get(
  '/products/:productId/reviews',
  validateParams(productReviewParamsSchema),
  validateQuery(productReviewQuerySchema),
  reviewController.getProductReviews
);

router.get(
  '/stores/:storeId/reviews',
  validateParams(storeReviewParamsSchema),
  validateQuery(storeReviewQuerySchema),
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

router.put('/reviews/:id', authenticate, validateParams(reviewIdParamSchema), validate(updateReviewSchema), reviewController.updateReview);

router.delete('/reviews/:id', authenticate, validateParams(reviewIdParamSchema), reviewController.deleteReview);

// Helpful/Not helpful
router.post('/reviews/:id/helpful', authenticate, validateParams(reviewIdParamSchema), validate(reviewFeedbackSchema), reviewController.markHelpful);

// Admin routes
router.get('/admin/reviews/pending', authenticate, requireAdmin, validateQuery(pendingReviewQuerySchema), reviewController.getPendingReviews);

router.post('/admin/reviews/:id/approve', authenticate, requireAdmin, validateParams(reviewIdParamSchema), validate(reviewApprovalSchema), reviewController.approveReview);

router.post('/admin/reviews/:id/reject', authenticate, requireAdmin, validateParams(reviewIdParamSchema), validate(reviewModerationSchema), reviewController.rejectReview);

export = router;
