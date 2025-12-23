/**
 * Payout Routes
 * API endpoints for vendor payouts and admin payout management
 */

const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payout.controller');
const { authenticate, requireSeller, requireAdmin } = require('../middlewares/auth');

// ================== VENDOR ROUTES ==================

/**
 * @route   GET /api/v1/payouts/balance
 * @desc    Get vendor's available balance
 * @access  Seller only
 */
router.get(
    '/balance',
    authenticate,
    requireSeller,
    payoutController.getBalance
);

/**
 * @route   POST /api/v1/payouts/request
 * @desc    Request a payout
 * @access  Seller only
 */
router.post(
    '/request',
    authenticate,
    requireSeller,
    payoutController.requestPayout
);

/**
 * @route   GET /api/v1/payouts/history
 * @desc    Get payout history
 * @access  Seller only
 */
router.get(
    '/history',
    authenticate,
    requireSeller,
    payoutController.getHistory
);

// ================== ADMIN ROUTES ==================

/**
 * @route   GET /api/v1/payouts/admin/pending
 * @desc    Get all pending payout requests
 * @access  Admin only
 */
router.get(
    '/admin/pending',
    authenticate,
    requireAdmin,
    payoutController.getPendingPayouts
);

/**
 * @route   GET /api/v1/payouts/admin/stats
 * @desc    Get payout statistics
 * @access  Admin only
 */
router.get(
    '/admin/stats',
    authenticate,
    requireAdmin,
    payoutController.getPayoutStats
);

/**
 * @route   GET /api/v1/payouts/admin/:id
 * @desc    Get payout details
 * @access  Admin only
 */
router.get(
    '/admin/:id',
    authenticate,
    requireAdmin,
    payoutController.getPayoutDetails
);

/**
 * @route   POST /api/v1/payouts/admin/:id/approve
 * @desc    Approve a payout request
 * @access  Admin only
 */
router.post(
    '/admin/:id/approve',
    authenticate,
    requireAdmin,
    payoutController.approvePayout
);

/**
 * @route   POST /api/v1/payouts/admin/:id/reject
 * @desc    Reject a payout request
 * @access  Admin only
 */
router.post(
    '/admin/:id/reject',
    authenticate,
    requireAdmin,
    payoutController.rejectPayout
);

/**
 * @route   POST /api/v1/payouts/admin/:id/complete
 * @desc    Mark payout as completed
 * @access  Admin only
 */
router.post(
    '/admin/:id/complete',
    authenticate,
    requireAdmin,
    payoutController.completePayout
);

module.exports = router;
