/**
 * Payout Service
 * Handles vendor payout calculations and request processing
 * 
 * Business Logic:
 * - Kargo ücreti platforma gider (Trendyol modeli)
 * - Komisyon oranı KDV dahil
 * - Minimum çekim tutarı: ₺100
 * - Admin manuel onay gerekli
 */

const { Op } = require('sequelize');
const {
    Order,
    Store,
    CommissionTransaction,
    VendorPayout,
    User
} = require('../models');
const logger = require('../utils/logger');

const MINIMUM_PAYOUT_AMOUNT = 100; // TL

class PayoutService {
    /**
     * Calculate vendor's available balance
     * @param {string} storeId - Store ID
     * @returns {Object} Balance breakdown
     */
    async getVendorBalance(storeId) {
        try {
            // Get all completed orders for this store
            const completedOrders = await Order.findAll({
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['delivered', 'completed'] },
                },
                attributes: ['id', 'total', 'shipping_fee', 'created_at'],
            });

            // Get commission transactions for these orders
            const commissions = await CommissionTransaction.findAll({
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['calculated', 'paid_to_seller'] },
                },
                attributes: ['id', 'order_id', 'seller_amount', 'commission_amount', 'order_total', 'status'],
            });

            // Get completed payouts
            const completedPayouts = await VendorPayout.findAll({
                where: {
                    store_id: storeId,
                    status: 'completed',
                },
                attributes: ['approved_amount'],
            });

            // Get pending/processing payouts
            const pendingPayouts = await VendorPayout.findAll({
                where: {
                    store_id: storeId,
                    status: { [Op.in]: ['pending', 'approved', 'processing'] },
                },
                attributes: ['requested_amount', 'status'],
            });

            // Calculate totals
            let totalSales = 0;
            let totalShipping = 0;
            let totalCommission = 0;
            let totalSellerEarnings = 0;

            commissions.forEach(c => {
                totalSales += parseFloat(c.order_total) || 0;
                totalCommission += parseFloat(c.commission_amount) || 0;
                totalSellerEarnings += parseFloat(c.seller_amount) || 0;
            });

            // Calculate shipping from orders
            completedOrders.forEach(o => {
                totalShipping += parseFloat(o.shipping_fee) || 0;
            });

            // Total already paid out
            const totalPaidOut = completedPayouts.reduce(
                (sum, p) => sum + (parseFloat(p.approved_amount) || 0),
                0
            );

            // Total pending payout requests
            const totalPending = pendingPayouts.reduce(
                (sum, p) => sum + (parseFloat(p.requested_amount) || 0),
                0
            );

            // Available balance = earnings - paid - pending
            const availableBalance = totalSellerEarnings - totalPaidOut - totalPending;

            return {
                // Summary
                totalSales: parseFloat(totalSales.toFixed(2)),
                totalShipping: parseFloat(totalShipping.toFixed(2)),
                platformCommission: parseFloat(totalCommission.toFixed(2)),
                totalEarnings: parseFloat(totalSellerEarnings.toFixed(2)),

                // Payout status
                totalPaidOut: parseFloat(totalPaidOut.toFixed(2)),
                pendingPayouts: parseFloat(totalPending.toFixed(2)),
                availableBalance: parseFloat(Math.max(0, availableBalance).toFixed(2)),

                // Can request payout?
                canRequestPayout: availableBalance >= MINIMUM_PAYOUT_AMOUNT,
                minimumPayoutAmount: MINIMUM_PAYOUT_AMOUNT,

                // Stats
                completedOrderCount: completedOrders.length,
                pendingPayoutCount: pendingPayouts.length,
            };
        } catch (error) {
            logger.error('[PayoutService] getVendorBalance error:', error);
            throw error;
        }
    }

    /**
     * Request a payout
     * @param {string} storeId - Store ID
     * @param {number} amount - Requested amount
     * @returns {Object} Created payout request
     */
    async requestPayout(storeId, amount) {
        try {
            // Validate amount
            if (amount < MINIMUM_PAYOUT_AMOUNT) {
                throw new Error(`Minimum çekim tutarı ₺${MINIMUM_PAYOUT_AMOUNT}`);
            }

            // Get current balance
            const balance = await this.getVendorBalance(storeId);

            if (amount > balance.availableBalance) {
                throw new Error(`Yetersiz bakiye. Mevcut: ₺${balance.availableBalance}`);
            }

            // Get store's bank details
            const store = await Store.findByPk(storeId, {
                attributes: ['id', 'name', 'bank_details'],
            });

            if (!store) {
                throw new Error('Mağaza bulunamadı');
            }

            const bankDetails = store.bank_details || {};

            if (!bankDetails.iban) {
                throw new Error('Lütfen önce banka bilgilerinizi girin');
            }

            // Create payout request
            const payout = await VendorPayout.create({
                store_id: storeId,
                requested_amount: amount,
                bank_name: bankDetails.bank_name || null,
                iban: bankDetails.iban,
                account_holder: bankDetails.account_holder || store.name,
                breakdown: {
                    total_earnings: balance.totalEarnings,
                    already_paid: balance.totalPaidOut,
                    pending_requests: balance.pendingPayouts,
                    available_before_request: balance.availableBalance,
                    requested_amount: amount,
                },
            });

            logger.info(`[PayoutService] Payout requested: Store ${storeId}, Amount ₺${amount}`);

            return payout;
        } catch (error) {
            logger.error('[PayoutService] requestPayout error:', error);
            throw error;
        }
    }

    /**
     * Get payout history for a store
     * @param {string} storeId - Store ID
     * @param {Object} options - Query options
     * @returns {Array} Payout history
     */
    async getPayoutHistory(storeId, options = {}) {
        try {
            const { limit = 20, offset = 0, status = null } = options;

            const where = { store_id: storeId };
            if (status) {
                where.status = status;
            }

            const payouts = await VendorPayout.findAndCountAll({
                where,
                order: [['requested_at', 'DESC']],
                limit,
                offset,
                include: [
                    {
                        model: User,
                        as: 'reviewer',
                        attributes: ['id', 'first_name', 'last_name', 'email'],
                    },
                ],
            });

            return {
                payouts: payouts.rows,
                total: payouts.count,
                limit,
                offset,
            };
        } catch (error) {
            logger.error('[PayoutService] getPayoutHistory error:', error);
            throw error;
        }
    }

    // ================== ADMIN METHODS ==================

    /**
     * Get all pending payout requests (Admin)
     * @param {Object} options - Query options
     * @returns {Array} Pending payouts
     */
    async getPendingPayouts(options = {}) {
        try {
            const { limit = 50, offset = 0 } = options;

            const payouts = await VendorPayout.findAndCountAll({
                where: { status: 'pending' },
                order: [['requested_at', 'ASC']], // FIFO
                limit,
                offset,
                include: [
                    {
                        model: Store,
                        as: 'store',
                        attributes: ['id', 'name', 'slug', 'logo'],
                    },
                ],
            });

            return {
                payouts: payouts.rows,
                total: payouts.count,
                limit,
                offset,
            };
        } catch (error) {
            logger.error('[PayoutService] getPendingPayouts error:', error);
            throw error;
        }
    }

    /**
     * Approve a payout request (Admin)
     * @param {string} payoutId - Payout ID
     * @param {string} adminId - Admin user ID
     * @param {number} approvedAmount - Amount to approve (optional)
     * @param {string} notes - Admin notes
     * @returns {Object} Updated payout
     */
    async approvePayout(payoutId, adminId, approvedAmount = null, notes = null) {
        try {
            const payout = await VendorPayout.findByPk(payoutId);

            if (!payout) {
                throw new Error('Ödeme talebi bulunamadı');
            }

            if (payout.status !== 'pending') {
                throw new Error('Bu talep zaten işlenmiş');
            }

            await payout.approve(adminId, approvedAmount, notes);

            logger.info(`[PayoutService] Payout approved: ${payoutId} by Admin ${adminId}`);

            return payout;
        } catch (error) {
            logger.error('[PayoutService] approvePayout error:', error);
            throw error;
        }
    }

    /**
     * Reject a payout request (Admin)
     * @param {string} payoutId - Payout ID
     * @param {string} adminId - Admin user ID
     * @param {string} reason - Rejection reason
     * @returns {Object} Updated payout
     */
    async rejectPayout(payoutId, adminId, reason) {
        try {
            if (!reason || reason.trim().length === 0) {
                throw new Error('Ret sebebi belirtilmeli');
            }

            const payout = await VendorPayout.findByPk(payoutId);

            if (!payout) {
                throw new Error('Ödeme talebi bulunamadı');
            }

            if (payout.status !== 'pending') {
                throw new Error('Bu talep zaten işlenmiş');
            }

            await payout.reject(adminId, reason);

            logger.info(`[PayoutService] Payout rejected: ${payoutId} by Admin ${adminId}`);

            return payout;
        } catch (error) {
            logger.error('[PayoutService] rejectPayout error:', error);
            throw error;
        }
    }

    /**
     * Mark payout as completed (Admin)
     * @param {string} payoutId - Payout ID
     * @param {string} transactionRef - Bank transaction reference
     * @returns {Object} Updated payout
     */
    async completePayout(payoutId, transactionRef) {
        try {
            const payout = await VendorPayout.findByPk(payoutId);

            if (!payout) {
                throw new Error('Ödeme talebi bulunamadı');
            }

            if (payout.status !== 'approved' && payout.status !== 'processing') {
                throw new Error('Bu talep onaylanmamış');
            }

            await payout.complete(transactionRef);

            // Update related commission transactions
            await CommissionTransaction.update(
                {
                    status: 'paid_to_seller',
                    payout_id: payoutId,
                    paid_at: new Date(),
                },
                {
                    where: {
                        store_id: payout.store_id,
                        status: 'calculated',
                    },
                }
            );

            logger.info(`[PayoutService] Payout completed: ${payoutId}, Ref: ${transactionRef}`);

            return payout;
        } catch (error) {
            logger.error('[PayoutService] completePayout error:', error);
            throw error;
        }
    }

    /**
     * Get payout statistics for admin dashboard
     * @returns {Object} Payout statistics
     */
    async getPayoutStats() {
        try {
            const [pending, processing, completed, rejected] = await Promise.all([
                VendorPayout.count({ where: { status: 'pending' } }),
                VendorPayout.count({ where: { status: { [Op.in]: ['approved', 'processing'] } } }),
                VendorPayout.count({ where: { status: 'completed' } }),
                VendorPayout.count({ where: { status: 'rejected' } }),
            ]);

            const totalPaid = await VendorPayout.sum('approved_amount', {
                where: { status: 'completed' },
            }) || 0;

            const pendingAmount = await VendorPayout.sum('requested_amount', {
                where: { status: 'pending' },
            }) || 0;

            return {
                counts: { pending, processing, completed, rejected },
                amounts: {
                    totalPaid: parseFloat(totalPaid.toFixed(2)),
                    pendingAmount: parseFloat(pendingAmount.toFixed(2)),
                },
            };
        } catch (error) {
            logger.error('[PayoutService] getPayoutStats error:', error);
            throw error;
        }
    }
}

module.exports = new PayoutService();
