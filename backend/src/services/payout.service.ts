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

import { Op } from 'sequelize';
import {
    Order,
    Store,
    CommissionTransaction,
    VendorPayout,
    User
} from '../models';
import logger from '../utils/logger';

const MINIMUM_PAYOUT_AMOUNT = 100; // TL

// Types
interface VendorBalance {
    totalSales: number;
    totalShipping: number;
    platformCommission: number;
    totalEarnings: number;
    totalPaidOut: number;
    pendingPayouts: number;
    availableBalance: number;
    canRequestPayout: boolean;
    minimumPayoutAmount: number;
    completedOrderCount: number;
    pendingPayoutCount: number;
}

interface PayoutBreakdown {
    total_earnings: number;
    already_paid: number;
    pending_requests: number;
    available_before_request: number;
    requested_amount: number;
}

interface QueryOptions {
    limit?: number;
    offset?: number;
    status?: string | null;
}

// Local instance type aliases
type VendorPayoutInstance = InstanceType<typeof VendorPayout>;

interface PayoutListResult {
    payouts: VendorPayoutInstance[];
    total: number;
    limit: number;
    offset: number;
}

interface PayoutStats {
    counts: {
        pending: number;
        processing: number;
        completed: number;
        rejected: number;
    };
    amounts: {
        totalPaid: number;
        pendingAmount: number;
    };
}

class PayoutService {
    /**
     * Calculate vendor's available balance
     */
    async getVendorBalance(storeId: string): Promise<VendorBalance> {
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

            commissions.forEach((c: any) => {
                totalSales += parseFloat(String(c.order_total)) || 0;
                totalCommission += parseFloat(String(c.commission_amount)) || 0;
                totalSellerEarnings += parseFloat(String(c.seller_amount)) || 0;
            });

            // Calculate shipping from orders
            completedOrders.forEach((o: any) => {
                totalShipping += parseFloat(String(o.shipping_fee)) || 0;
            });

            // Total already paid out
            const totalPaidOut = completedPayouts.reduce(
                (sum: number, p: any) => sum + (parseFloat(String(p.approved_amount)) || 0),
                0
            );

            // Total pending payout requests
            const totalPending = pendingPayouts.reduce(
                (sum: number, p) => sum + (parseFloat(String(p.requested_amount)) || 0),
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
                totalPaidOut: parseFloat(String(totalPaidOut).replace(/[^0-9.-]/g, '') || '0'),
                pendingPayouts: parseFloat(String(totalPending).replace(/[^0-9.-]/g, '') || '0'),
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
     */
    async requestPayout(storeId: string, amount: number): Promise<VendorPayoutInstance> {
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

            const bankDetails = (store as any).bank_details || {};

            if (!bankDetails.iban) {
                throw new Error('Lütfen önce banka bilgilerinizi girin');
            }

            // Create payout request
            const breakdown: PayoutBreakdown = {
                total_earnings: balance.totalEarnings,
                already_paid: balance.totalPaidOut,
                pending_requests: balance.pendingPayouts,
                available_before_request: balance.availableBalance,
                requested_amount: amount,
            };

            const payout = await VendorPayout.create({
                store_id: storeId,
                requested_amount: amount,
                bank_name: bankDetails.bank_name || null,
                iban: bankDetails.iban,
                account_holder: bankDetails.account_holder || store.name,
                breakdown: breakdown as any,
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
     */
    async getPayoutHistory(storeId: string, options: QueryOptions = {}): Promise<PayoutListResult> {
        try {
            const { limit = 20, offset = 0, status = null } = options;

            const where: Record<string, unknown> = { store_id: storeId };
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
     */
    async getPendingPayouts(options: QueryOptions = {}): Promise<PayoutListResult> {
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
     */
    async approvePayout(
        payoutId: string,
        adminId: string,
        approvedAmount: number | null = null,
        notes: string | null = null
    ): Promise<VendorPayoutInstance> {
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
     */
    async rejectPayout(payoutId: string, adminId: string, reason: string): Promise<VendorPayoutInstance> {
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
     */
    async completePayout(payoutId: string, transactionRef: string): Promise<VendorPayoutInstance> {
        try {
            const payout = await VendorPayout.findByPk(payoutId);

            if (!payout) {
                throw new Error('Ödeme talebi bulunamadı');
            }

            if ((payout.status as string) !== 'approved' && (payout.status as string) !== 'processing') {
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
     */
    async getPayoutStats(): Promise<PayoutStats> {
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

export = new PayoutService();
