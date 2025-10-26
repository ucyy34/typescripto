/**
 * Coupon Routes
 * Routes for coupon management
 */

const express = require('express');
const router = express.Router();

const couponController = require('../controllers/coupon.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponQuerySchema,
  couponIdParamSchema,
} = require('../validators/coupon.validator');

// ============================================
// PUBLIC/USER ROUTES
// ============================================

/**
 * @route   GET /api/v1/coupons/active
 * @desc    Get all active coupons
 * @access  Public (optional auth for user-specific filtering)
 */
router.get('/active', couponController.getActiveCoupons);

/**
 * @route   POST /api/v1/coupons/validate
 * @desc    Validate a coupon code
 * @access  Public (optional auth)
 */
router.post(
  '/validate',
  validate(validateCouponSchema),
  couponController.validateCoupon
);

/**
 * @route   GET /api/v1/coupons/my-history
 * @desc    Get user's coupon usage history
 * @access  Private (User)
 */
router.get(
  '/my-history',
  authenticate,
  couponController.getUserCouponHistory
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   POST /api/v1/coupons
 * @desc    Create new coupon
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createCouponSchema),
  couponController.createCoupon
);

/**
 * @route   GET /api/v1/coupons
 * @desc    Get all coupons with filters
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  validateQuery(couponQuerySchema),
  couponController.getAllCoupons
);

/**
 * @route   GET /api/v1/coupons/:id
 * @desc    Get coupon by ID
 * @access  Private (Admin)
 */
router.get(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  couponController.getCouponById
);

/**
 * @route   PATCH /api/v1/coupons/:id
 * @desc    Update coupon
 * @access  Private (Admin)
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  validate(updateCouponSchema),
  couponController.updateCoupon
);

/**
 * @route   DELETE /api/v1/coupons/:id
 * @desc    Delete coupon
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  couponController.deleteCoupon
);

/**
 * @route   PATCH /api/v1/coupons/:id/approve
 * @desc    Approve (activate) a coupon
 * @access  Private (Admin)
 */
router.patch(
  '/:id/approve',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  couponController.approveCoupon
);

/**
 * @route   PATCH /api/v1/coupons/:id/reject
 * @desc    Reject (deactivate) a coupon
 * @access  Private (Admin)
 */
router.patch(
  '/:id/reject',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  couponController.rejectCoupon
);

/**
 * @route   PATCH /api/v1/coupons/:id/enable
 * @desc    Enable a coupon
 * @access  Private (Admin)
 */
router.patch(
  '/:id/enable',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  couponController.enableCoupon
);

/**
 * @route   PATCH /api/v1/coupons/:id/disable
 * @desc    Disable a coupon
 * @access  Private (Admin)
 */
router.patch(
  '/:id/disable',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  couponController.disableCoupon
);

/**
 * @route   GET /api/v1/coupons/:id/stats
 * @desc    Get coupon statistics
 * @access  Private (Admin)
 */
router.get(
  '/:id/stats',
  authenticate,
  requireRole('admin'),
  validateParams(couponIdParamSchema),
  couponController.getCouponStats
);

module.exports = router;








