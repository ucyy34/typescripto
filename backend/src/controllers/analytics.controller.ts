/**
 * Analytics Controller
 * Handle analytics HTTP requests for vendor and admin dashboards
 */

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// TODO(ts-migration): replace any with proper service types
import _vendorAnalyticsService from '../services/vendorAnalytics.service';
import _storeService from '../services/store.service';
const vendorAnalyticsService = _vendorAnalyticsService as any;
const storeService = _storeService as any;

import { success } from '../utils/response';
import { asyncHandler, ApiError } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
    user?: { id: string; role: string };
}

class AnalyticsController {
    getVendorDashboard = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }
        const stats = await vendorAnalyticsService.getDashboardStats(store.id);
        return success(res, stats, 'Vendor dashboard stats retrieved successfully');
    });

    getVendorSalesChart = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }
        const days = parseInt(req.query.days as string) || 30;
        const salesData = await vendorAnalyticsService.getSalesChart(store.id, days);
        return success(res, salesData, 'Sales chart data retrieved successfully');
    });

    getVendorTopProducts = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }
        const limit = parseInt(req.query.limit as string) || 5;
        const products = await vendorAnalyticsService.getTopProducts(store.id, limit);
        return success(res, products, 'Top products retrieved successfully');
    });

    getVendorRecentOrders = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('No store found for this user', StatusCodes.NOT_FOUND);
        }
        const limit = parseInt(req.query.limit as string) || 10;
        const orders = await vendorAnalyticsService.getRecentOrders(store.id, limit);
        return success(res, orders, 'Recent orders retrieved successfully');
    });

    getAdminOverview = asyncHandler(async (req: Request, res: Response) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const stats = await adminAnalyticsService.getPlatformOverview();
        return success(res, stats, 'Platform overview retrieved successfully');
    });

    getAdminTopStores = asyncHandler(async (req: Request, res: Response) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const limit = parseInt(req.query.limit as string) || 10;
        const stores = await adminAnalyticsService.getTopStores(limit);
        return success(res, stores, 'Top stores retrieved successfully');
    });

    getAdminRevenueChart = asyncHandler(async (req: Request, res: Response) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const days = parseInt(req.query.days as string) || 30;
        const revenueData = await adminAnalyticsService.getRevenueChart(days);
        return success(res, revenueData, 'Revenue chart data retrieved successfully');
    });

    getAdminRecentActivity = asyncHandler(async (req: Request, res: Response) => {
        const adminAnalyticsService = require('../services/adminAnalytics.service');
        const limit = parseInt(req.query.limit as string) || 20;
        const activity = await adminAnalyticsService.getRecentActivity(limit);
        return success(res, activity, 'Recent activity retrieved successfully');
    });
}

export = new AnalyticsController();
