/**
 * Vendor Analytics Service
 * Calculates and aggregates analytics data for vendor dashboard
 */

import { Order, Product, Store, ReturnRequest } from '../models';
import { Op } from 'sequelize';
import logger from '../utils/logger';

class VendorAnalyticsService {
    /**
     * Get vendor dashboard overview stats
     * @param {string} storeId - Store UUID
     * @returns {Object} Dashboard statistics
     */
    async getDashboardStats(storeId) {
        try {
            const store = await Store.findByPk(storeId);
            if (!store) {
                throw new Error('Store not found');
            }

            // Get date ranges
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Total orders for this store
            const totalOrders = await Order.count({
                where: {
                    store_id: storeId,
                    status: { [Op.notIn]: ['cancelled', 'failed'] },
                },
            });

            // Total revenue (completed orders only)
            const revenueResult = await Order.sum('total', {
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['completed', 'delivered'] },
                },
            });
            const totalRevenue = revenueResult || 0;

            // Revenue last 30 days
            const revenue30Days = await Order.sum('total', {
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['completed', 'delivered'] },
                    createdAt: { [Op.gte]: thirtyDaysAgo },
                },
            }) || 0;

            // Orders last 7 days
            const orders7Days = await Order.count({
                where: {
                    store_id: storeId,
                    status: { [Op.notIn]: ['cancelled', 'failed'] },
                    createdAt: { [Op.gte]: sevenDaysAgo },
                },
            });

            // Pending orders
            const pendingOrders = await Order.count({
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['pending', 'processing', 'confirmed'] },
                },
            });

            // Total products
            const totalProducts = await Product.count({
                where: {
                    store_id: storeId,
                    status: 'approved',
                },
            });

            // Active products (in stock)
            const activeProducts = await Product.count({
                where: {
                    store_id: storeId,
                    status: 'approved',
                    is_active: true,
                    stock: { [Op.gt]: 0 },
                },
            });

            // Return requests count
            const totalReturns = await ReturnRequest.count({
                where: { store_id: storeId },
            });

            // Approved returns (completed refunds)
            const approvedReturns = await ReturnRequest.count({
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['approved', 'completed', 'refunded'] },
                },
            });

            // Calculate return rate
            const returnRate = totalOrders > 0
                ? ((approvedReturns / totalOrders) * 100).toFixed(1)
                : 0;

            // Average order value
            const avgOrderValue = totalOrders > 0
                ? (totalRevenue / totalOrders).toFixed(2)
                : 0;

            return {
                overview: {
                    totalOrders,
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    revenue30Days: parseFloat(revenue30Days.toFixed(2)),
                    orders7Days,
                    pendingOrders,
                    avgOrderValue: parseFloat(String(avgOrderValue)),
                },
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    outOfStock: totalProducts - activeProducts,
                },
                returns: {
                    total: totalReturns,
                    approved: approvedReturns,
                    returnRate: parseFloat(String(returnRate)),
                },
                store: {
                    name: store.name,
                    rating: store.rating || 0,
                    status: store.status,
                },
            };
        } catch (error) {
            logger.error('[VendorAnalytics] getDashboardStats error:', error);
            throw error;
        }
    }

    /**
     * Get sales data for charts (daily breakdown)
     * @param {string} storeId - Store UUID
     * @param {number} days - Number of days to fetch (default 30)
     * @returns {Array} Daily sales data
     */
    async getSalesChart(storeId, days = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

            // Get orders grouped by date
            const orders = await Order.findAll({
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['completed', 'delivered'] },
                    createdAt: { [Op.between]: [startDate, endDate] },
                },
                attributes: ['total', 'createdAt'],
                order: [['createdAt', 'ASC']],
            });

            // Group by date
            const dailyData = {};
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                const dateKey = date.toISOString().split('T')[0];
                dailyData[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
            }

            orders.forEach(order => {
                const dateKey = order.createdAt.toISOString().split('T')[0];
                if (dailyData[dateKey]) {
                    dailyData[dateKey].revenue += parseFloat(String(order.total)) || 0;
                    dailyData[dateKey].orders += 1;
                }
            });

            return Object.values(dailyData);
        } catch (error) {
            logger.error('[VendorAnalytics] getSalesChart error:', error);
            throw error;
        }
    }

    /**
     * Get top selling products
     * @param {string} storeId - Store UUID
     * @param {number} limit - Number of products to return
     * @returns {Array} Top products by sales
     */
    async getTopProducts(storeId, limit = 5) {
        try {
            const products = await Product.findAll({
                where: {
                    store_id: storeId,
                    status: 'approved',
                },
                attributes: ['id', 'title', 'price', 'total_sales', 'stock', 'images'],
                order: [['total_sales', 'DESC']],
                limit,
            });

            return products.map(p => ({
                id: p.id,
                title: p.title,
                price: parseFloat(String(p.price)),
                totalSales: p.total_sales || 0,
                stock: p.stock,
                image: p.images?.[0] || null,
            }));
        } catch (error) {
            logger.error('[VendorAnalytics] getTopProducts error:', error);
            throw error;
        }
    }

    /**
     * Get recent orders summary
     * @param {string} storeId - Store UUID
     * @param {number} limit - Number of orders
     * @returns {Array} Recent orders
     */
    async getRecentOrders(storeId, limit = 10) {
        try {
            const orders = await Order.findAll({
                where: { store_id: storeId },
                attributes: ['id', 'order_number', 'total', 'status', 'createdAt'],
                order: [['createdAt', 'DESC']],
                limit,
            });

            return orders.map(o => ({
                id: o.id,
                orderNumber: o.order_number,
                total: parseFloat(String(o.total)),
                status: o.status,
                date: o.createdAt,
            }));
        } catch (error) {
            logger.error('[VendorAnalytics] getRecentOrders error:', error);
            throw error;
        }
    }
}

export = new VendorAnalyticsService();
