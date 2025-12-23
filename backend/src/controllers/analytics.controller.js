/**
 * Analytics Controller
 * Handle analytics HTTP requests for vendor and admin dashboards
 */

const vendorAnalyticsService = require('../services/vendorAnalytics.service');
const storeService = require('../services/store.service');
const { success } = require('../utils/response');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');

class AnalyticsController {
    /**
     * Get vendor dashboard stats
     * GET /api/v1/analytics/vendor/dashboard
     */
    getVendorDashboard = asyncHandler(async (req, res) => {
        // Get user's store
        const store = await storeService.getStoreByUserId(req.user.id);

        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }

        const stats = await vendorAnalyticsService.getDashboardStats(store.id);

        return success(res, stats, 'Vendor dashboard stats retrieved successfully');
    });

    /**
     * Get vendor sales chart data
     * GET /api/v1/analytics/vendor/sales?days=30
     */
    getVendorSalesChart = asyncHandler(async (req, res) => {
        const store = await storeService.getStoreByUserId(req.user.id);

        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }

        const days = parseInt(req.query.days) || 30;
        const salesData = await vendorAnalyticsService.getSalesChart(store.id, days);

        return success(res, salesData, 'Sales chart data retrieved successfully');
    });

    /**
     * Get vendor top products
     * GET /api/v1/analytics/vendor/top-products?limit=5
     */
    getVendorTopProducts = asyncHandler(async (req, res) => {
        const store = await storeService.getStoreByUserId(req.user.id);

        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }

        const limit = parseInt(req.query.limit) || 5;
        const products = await vendorAnalyticsService.getTopProducts(store.id, limit);

        return success(res, products, 'Top products retrieved successfully');
    });

    /**
     * Get vendor recent orders
     * GET /api/v1/analytics/vendor/recent-orders?limit=10
     */
    getVendorRecentOrders = asyncHandler(async (req, res) => {
        const store = await storeService.getStoreByUserId(req.user.id);

        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }

        const limit = parseInt(req.query.limit) || 10;
        const orders = await vendorAnalyticsService.getRecentOrders(store.id, limit);

        return success(res, orders, 'Recent orders retrieved successfully');
    });

    // ==================== ADMIN ANALYTICS ====================

    /**
     * Get admin platform overview
     * GET /api/v1/analytics/admin/overview
     */
    getAdminOverview = asyncHandler(async (req, res) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const stats = await adminAnalyticsService.getPlatformOverview();

        return success(res, stats, 'Platform overview retrieved successfully');
    });

    /**
     * Get top performing stores
     * GET /api/v1/analytics/admin/top-stores?limit=10
     */
    getAdminTopStores = asyncHandler(async (req, res) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const limit = parseInt(req.query.limit) || 10;
        const stores = await adminAnalyticsService.getTopStores(limit);

        return success(res, stores, 'Top stores retrieved successfully');
    });

    /**
     * Get platform revenue chart
     * GET /api/v1/analytics/admin/revenue?days=30
     */
    getAdminRevenueChart = asyncHandler(async (req, res) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const days = parseInt(req.query.days) || 30;
        const revenueData = await adminAnalyticsService.getRevenueChart(days);

        return success(res, revenueData, 'Revenue chart data retrieved successfully');
    });

    /**
     * Get recent platform activity
     * GET /api/v1/analytics/admin/activity?limit=20
     */
    getAdminRecentActivity = asyncHandler(async (req, res) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const limit = parseInt(req.query.limit) || 20;
        const activity = await adminAnalyticsService.getRecentActivity(limit);

        return success(res, activity, 'Recent activity retrieved successfully');
    });
}

module.exports = new AnalyticsController();
