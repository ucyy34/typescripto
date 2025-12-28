/**
 * Analytics Routes
 * API endpoints for vendor and admin analytics
 */

import { Router } from 'express';

import analyticsController from '../controllers/analytics.controller';
import { authenticate, requireSeller, requireAdmin } from '../middlewares/auth';

const router: Router = Router();

// Vendor routes
router.get('/vendor/dashboard', authenticate, requireSeller, analyticsController.getVendorDashboard);
router.get('/vendor/sales', authenticate, requireSeller, analyticsController.getVendorSalesChart);
router.get('/vendor/top-products', authenticate, requireSeller, analyticsController.getVendorTopProducts);
router.get('/vendor/recent-orders', authenticate, requireSeller, analyticsController.getVendorRecentOrders);

// Admin routes
router.get('/admin/overview', authenticate, requireAdmin, analyticsController.getAdminOverview);
router.get('/admin/top-stores', authenticate, requireAdmin, analyticsController.getAdminTopStores);
router.get('/admin/revenue', authenticate, requireAdmin, analyticsController.getAdminRevenueChart);
router.get('/admin/activity', authenticate, requireAdmin, analyticsController.getAdminRecentActivity);

export = router;
