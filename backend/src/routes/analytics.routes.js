/**
 * Analytics Routes
 * API endpoints for vendor and admin analytics
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, requireSeller, requireAdmin } = require('../middlewares/auth');

/**
 * @route   GET /api/v1/analytics/vendor/dashboard
 * @desc    Get vendor dashboard overview stats
 * @access  Seller only
 */
router.get(
    '/vendor/dashboard',
    authenticate,
    requireSeller,
    analyticsController.getVendorDashboard
);

/**
 * @route   GET /api/v1/analytics/vendor/sales
 * @desc    Get vendor sales chart data
 * @access  Seller only
 * @query   days - Number of days (default 30)
 */
router.get(
    '/vendor/sales',
    authenticate,
    requireSeller,
    analyticsController.getVendorSalesChart
);

/**
 * @route   GET /api/v1/analytics/vendor/top-products
 * @desc    Get vendor top selling products
 * @access  Seller only
 * @query   limit - Number of products (default 5)
 */
router.get(
    '/vendor/top-products',
    authenticate,
    requireSeller,
    analyticsController.getVendorTopProducts
);

/**
 * @route   GET /api/v1/analytics/vendor/recent-orders
 * @desc    Get vendor recent orders
 * @access  Seller only
 * @query   limit - Number of orders (default 10)
 */
router.get(
    '/vendor/recent-orders',
    authenticate,
    requireSeller,
    analyticsController.getVendorRecentOrders
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/analytics/admin/overview
 * @desc    Get platform overview stats
 * @access  Admin only
 */
router.get(
    '/admin/overview',
    authenticate,
    requireAdmin,
    analyticsController.getAdminOverview
);

/**
 * @route   GET /api/v1/analytics/admin/top-stores
 * @desc    Get top performing stores
 * @access  Admin only
 * @query   limit - Number of stores (default 10)
 */
router.get(
    '/admin/top-stores',
    authenticate,
    requireAdmin,
    analyticsController.getAdminTopStores
);

/**
 * @route   GET /api/v1/analytics/admin/revenue
 * @desc    Get platform revenue chart
 * @access  Admin only
 * @query   days - Number of days (default 30)
 */
router.get(
    '/admin/revenue',
    authenticate,
    requireAdmin,
    analyticsController.getAdminRevenueChart
);

/**
 * @route   GET /api/v1/analytics/admin/activity
 * @desc    Get recent platform activity
 * @access  Admin only
 * @query   limit - Number of items (default 20)
 */
router.get(
    '/admin/activity',
    authenticate,
    requireAdmin,
    analyticsController.getAdminRecentActivity
);

module.exports = router;
