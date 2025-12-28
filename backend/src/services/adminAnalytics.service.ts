/**
 * Admin Analytics Service
 * Platform-wide analytics and statistics for admin dashboard
 */

import { Order, Product, Store, User, ReturnRequest, Category } from '../models';
import { Op } from 'sequelize';
import logger from '../utils/logger';

class AdminAnalyticsService {
    /**
     * Get platform overview stats
     * @returns {Object} Platform-wide statistics
     */
    async getPlatformOverview() {
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Total users
            const totalUsers = await User.count({ where: { is_active: true } });
            const newUsers7Days = await User.count({
                where: {
                    is_active: true,
                    createdAt: { [Op.gte]: sevenDaysAgo },
                },
            });

            // Total stores
            const totalStores = await Store.count();
            const approvedStores = await Store.count({ where: { status: 'approved' } });
            const pendingStores = await Store.count({ where: { status: 'pending' } });

            // Total products
            const totalProducts = await Product.count();
            const approvedProducts = await Product.count({ where: { status: 'approved' } });
            const pendingProducts = await Product.count({ where: { status: 'pending' } });

            // Total orders
            const totalOrders = await Order.count({
                where: { status: { [Op.notIn]: ['cancelled', 'failed'] } },
            });
            const orders7Days = await Order.count({
                where: {
                    status: { [Op.notIn]: ['cancelled', 'failed'] },
                    createdAt: { [Op.gte]: sevenDaysAgo },
                },
            });

            // Total revenue
            const totalRevenueResult = await Order.sum('total', {
                where: { status: { [Op.in]: ['completed', 'delivered'] } },
            });
            const totalRevenue = totalRevenueResult || 0;

            const revenue30Days = await Order.sum('total', {
                where: {
                    status: { [Op.in]: ['completed', 'delivered'] },
                    createdAt: { [Op.gte]: thirtyDaysAgo },
                },
            }) || 0;

            // Returns
            const totalReturns = await ReturnRequest.count();
            const pendingReturns = await ReturnRequest.count({
                where: { status: 'pending' },
            });

            // Categories
            const totalCategories = await Category.count();

            return {
                users: {
                    total: totalUsers,
                    new7Days: newUsers7Days,
                },
                stores: {
                    total: totalStores,
                    approved: approvedStores,
                    pending: pendingStores,
                },
                products: {
                    total: totalProducts,
                    approved: approvedProducts,
                    pending: pendingProducts,
                },
                orders: {
                    total: totalOrders,
                    last7Days: orders7Days,
                },
                revenue: {
                    total: parseFloat(totalRevenue.toFixed(2)),
                    last30Days: parseFloat(revenue30Days.toFixed(2)),
                },
                returns: {
                    total: totalReturns,
                    pending: pendingReturns,
                },
                categories: totalCategories,
            };
        } catch (error) {
            logger.error('[AdminAnalytics] getPlatformOverview error:', error);
            throw error;
        }
    }

    /**
     * Get top performing stores
     * @param {number} limit - Number of stores to return
     * @returns {Array} Top stores by revenue
     */
    async getTopStores(limit = 10) {
        try {
            // Get stores with their order totals
            const stores = await Store.findAll({
                where: { status: 'approved' },
                attributes: ['id', 'name', 'slug', 'logo', 'rating', 'status'],
                limit,
            });

            // Calculate revenue for each store
            const storeStats = await Promise.all(
                stores.map(async (store) => {
                    const revenue = await Order.sum('total', {
                        where: {
                            store_id: store.id,
                            status: { [Op.in]: ['completed', 'delivered'] },
                        },
                    }) || 0;

                    const orderCount = await Order.count({
                        where: {
                            store_id: store.id,
                            status: { [Op.notIn]: ['cancelled', 'failed'] },
                        },
                    });

                    const productCount = await Product.count({
                        where: {
                            store_id: store.id,
                            status: 'approved',
                        },
                    });

                    return {
                        id: store.id,
                        name: store.name,
                        slug: store.slug,
                        logo: store.logo,
                        rating: store.rating || 0,
                        revenue: parseFloat(revenue.toFixed(2)),
                        orders: orderCount,
                        products: productCount,
                    };
                })
            );

            // Sort by revenue descending
            return storeStats.sort((a, b) => b.revenue - a.revenue);
        } catch (error) {
            logger.error('[AdminAnalytics] getTopStores error:', error);
            throw error;
        }
    }

    /**
     * Get platform revenue chart data
     * @param {number} days - Number of days
     * @returns {Array} Daily revenue data
     */
    async getRevenueChart(days = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

            const orders = (await Order.findAll({
                where: {
                    status: { [Op.in]: ['completed', 'delivered'] },
                    createdAt: { [Op.between]: [startDate, endDate] },
                },
                attributes: ['total', 'createdAt'],
                order: [['createdAt', 'ASC']],
            })) as Array<{ total: string | number; createdAt: Date }>;

            // Group by date
            const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                const dateKey = date.toISOString().split('T')[0];
                dailyData[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
            }

            orders.forEach((order) => {
                const dateKey = order.createdAt.toISOString().split('T')[0];
                if (dailyData[dateKey]) {
                    dailyData[dateKey].revenue += parseFloat(String(order.total)) || 0;
                    dailyData[dateKey].orders += 1;
                }
            });

            return Object.values(dailyData);
        } catch (error) {
            logger.error('[AdminAnalytics] getRevenueChart error:', error);
            throw error;
        }
    }

    /**
     * Get recent activity feed
     * @param {number} limit - Number of items
     * @returns {Array} Recent activities
     */
    async getRecentActivity(limit = 20) {
        try {
            // Get recent orders
            const recentOrders = await Order.findAll({
                attributes: ['id', 'order_number', 'total', 'status', 'createdAt'],
                order: [['createdAt', 'DESC']],
                limit: 5,
            });

            // Get recent stores
            const recentStores = await Store.findAll({
                attributes: ['id', 'name', 'status', 'created_at'],
                order: [['created_at', 'DESC']],
                limit: 5,
            });

            // Get recent products
            const recentProducts = await Product.findAll({
                attributes: ['id', 'title', 'status', 'created_at'],
                order: [['created_at', 'DESC']],
                limit: 5,
            });

            // Combine and format activities
            const activities = [
                ...recentOrders.map(o => ({
                    type: 'order',
                    id: o.id,
                    title: `Sipariş #${o.order_number}`,
                    subtitle: `₺${o.total} - ${o.status}`,
                    date: o.createdAt,
                    icon: '🛒',
                })),
                ...recentStores.map(s => ({
                    type: 'store',
                    id: s.id,
                    title: s.name,
                    subtitle: `Mağaza - ${s.status}`,
                    date: s.createdAt,
                    icon: '🏪',
                })),
                ...recentProducts.map(p => ({
                    type: 'product',
                    id: p.id,
                    title: p.title,
                    subtitle: `Ürün - ${p.status}`,
                    date: p.createdAt,
                    icon: '📦',
                })),
            ];

            // Sort by date and limit
            return activities
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, limit);
        } catch (error) {
            logger.error('[AdminAnalytics] getRecentActivity error:', error);
            throw error;
        }
    }
}

export = new AdminAnalyticsService();
