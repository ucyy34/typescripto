/**
 * Commission Routes
 * Routes for commission management
 */

const express = require('express');
const router = express.Router();

const commissionController = require('../controllers/commission.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
  commissionSettingsSchema,
  commissionQuerySchema,
  summaryQuerySchema,
  markAsPaidSchema,
  uuidParamSchema,
  storeIdParamSchema,
} = require('../validators/commission.validator');

// ============================================
// VENDOR/SELLER ROUTES
// ============================================

/**
 * @route   GET /api/v1/commissions/store/:storeId
 * @desc    Get store's commission transactions
 * @access  Private (Seller)
 */
router.get(
  '/store/:storeId',
  authenticate,
  requireRole('seller', 'admin'),
  validateParams(storeIdParamSchema),
  validateQuery(commissionQuerySchema),
  commissionController.getStoreCommissions
);

/**
 * @route   GET /api/v1/commissions/store/:storeId/summary
 * @desc    Get store's commission summary
 * @access  Private (Seller)
 */
router.get(
  '/store/:storeId/summary',
  authenticate,
  requireRole('seller', 'admin'),
  validateParams(storeIdParamSchema),
  validateQuery(summaryQuerySchema),
  commissionController.getStoreSummary
);

/**
 * @route   GET /api/v1/commissions/order/:id
 * @desc    Get commission for a specific order
 * @access  Private (Seller/Admin)
 */
router.get(
  '/order/:id',
  authenticate,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  commissionController.getCommissionByOrder
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   GET /api/v1/admin/commissions
 * @desc    Get all commission transactions
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  requireRole('admin'),
  validateQuery(commissionQuerySchema),
  commissionController.getAllCommissions
);

/**
 * @route   GET /api/v1/admin/commissions/summary
 * @desc    Get platform commission summary
 * @access  Private (Admin)
 */
router.get(
  '/admin/summary',
  authenticate,
  requireRole('admin'),
  validateQuery(summaryQuerySchema),
  commissionController.getPlatformSummary
);

/**
 * @route   POST /api/v1/admin/commissions/settings
 * @desc    Create or update commission settings
 * @access  Private (Admin)
 */
router.post(
  '/admin/settings',
  authenticate,
  requireRole('admin'),
  validate(commissionSettingsSchema),
  commissionController.createOrUpdateSettings
);

/**
 * @route   GET /api/v1/admin/commissions/settings/:storeId?
 * @desc    Get commission settings
 * @access  Private (Admin)
 */
router.get(
  '/admin/settings/:storeId?',
  authenticate,
  requireRole('admin'),
  commissionController.getSettings
);

/**
 * @route   PATCH /api/v1/admin/commissions/:id/paid
 * @desc    Mark commission as paid to seller
 * @access  Private (Admin)
 */
router.patch(
  '/admin/:id/paid',
  authenticate,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(markAsPaidSchema),
  commissionController.markAsPaid
);

/**
 * @route   POST /api/v1/admin/commissions/initialize
 * @desc    Initialize default commission settings
 * @access  Private (Admin)
 */
router.post(
  '/admin/initialize',
  authenticate,
  requireRole('admin'),
  commissionController.initializeSettings
);

module.exports = router;










