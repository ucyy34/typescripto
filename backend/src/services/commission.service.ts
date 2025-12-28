/**
 * Commission Service
 * Handles commission calculations and transactions
 */

import {
    CommissionSettings,
    CommissionTransaction,
    Store,
    Order,
    OrderItem,
    Product,
    Category,
} from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';

// Local instance type aliases
type OrderInstance = InstanceType<typeof Order>;
type CommissionSettingsInstance = InstanceType<typeof CommissionSettings>;
type CommissionTransactionInstance = InstanceType<typeof CommissionTransaction>;

// Types
interface CommissionFilters {
    page?: number | string;
    limit?: number | string;
    status?: string;
    storeId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
}

interface CommissionCalculation {
    settings: CommissionSettingsInstance;
    order_total: number;
    commission_rate: number;
    commission_amount: number;
    seller_amount: number;
    platform_amount: number;
    calculation_type: 'category_based' | 'global';
    item_breakdown: ItemBreakdown[];
}

interface ItemBreakdown {
    product_id: string;
    product_name: string;
    category_name: string;
    item_total: number;
    commission_rate: number;
    commission_amount: number;
    rate_source: 'global' | 'category';
}

interface PaymentDetails {
    payment_method?: string;
    payment_reference?: string;
    payout_id?: string;
}

interface OrderEvent {
    orderId: string;
}

interface SettingsData {
    store_id?: string | null;
    default_rate?: number;
    min_commission?: number;
    max_commission?: number;
    [key: string]: unknown;
}

class CommissionService {
    /**
     * Calculate commission for an order
     * Supports category-based rates (overrides global settings)
     */
    async calculateCommission(order: OrderInstance): Promise<CommissionCalculation> {
        // Get commission settings for the store
        const settings = await CommissionSettings.getActiveSettings(order.store_id);

        if (!settings) {
            throw new ApiError(
                'No commission settings found for this store',
                StatusCodes.NOT_FOUND
            );
        }

        if (!settings.isValid()) {
            throw new ApiError(
                'Commission settings are not currently valid',
                StatusCodes.BAD_REQUEST
            );
        }

        // Get order items with product categories
        const orderItems = await OrderItem.findAll({
            where: { order_id: order.id },
            include: [
                {
                    model: Product,
                    as: 'product',
                    include: [
                        {
                            model: Category,
                            as: 'category',
                            attributes: ['id', 'name', 'commission_rate'],
                        },
                    ],
                },
            ],
        });

        let totalCommission = 0;
        let hasCustomRates = false;
        const itemBreakdown: ItemBreakdown[] = [];

        // Calculate commission for each item (category-based or global)
        for (const item of orderItems) {
            const itemTotal = parseFloat(String(item.total));
            const category = (item as any).product?.category;

            let itemCommissionRate = parseFloat(String(settings.default_rate));
            let rateSource: 'global' | 'category' = 'global';

            // Check if category has custom commission rate
            if (category && category.commission_rate !== null) {
                itemCommissionRate = parseFloat(String(category.commission_rate));
                rateSource = 'category';
                hasCustomRates = true;
            }

            const itemCommission = itemTotal * (itemCommissionRate / 100);
            totalCommission += itemCommission;

            itemBreakdown.push({
                product_id: item.product_id,
                product_name: (item as any).product?.name || 'Unknown',
                category_name: category?.name || 'Unknown',
                item_total: itemTotal,
                commission_rate: itemCommissionRate,
                commission_amount: parseFloat(itemCommission.toFixed(2)),
                rate_source: rateSource,
            });
        }

        // Apply min/max constraints
        if (settings.min_commission && totalCommission < settings.min_commission) {
            totalCommission = settings.min_commission;
        }
        if (settings.max_commission && totalCommission > settings.max_commission) {
            totalCommission = settings.max_commission;
        }

        const commissionAmount = parseFloat(totalCommission.toFixed(2));
        const sellerAmount = parseFloat((parseFloat(String(order.total)) - commissionAmount).toFixed(2));

        // Calculate average rate for display
        const averageRate = (commissionAmount / parseFloat(String(order.total))) * 100;

        return {
            settings,
            order_total: parseFloat(String(order.total)),
            commission_rate: parseFloat(averageRate.toFixed(2)),
            commission_amount: commissionAmount,
            seller_amount: sellerAmount,
            platform_amount: commissionAmount,
            calculation_type: hasCustomRates ? 'category_based' : 'global',
            item_breakdown: itemBreakdown,
        };
    }

    /**
     * Create commission transaction for an order
     */
    async createCommissionTransaction(orderId: string): Promise<CommissionTransactionInstance> {
        // Get order with store info
        const order = await Order.findByPk(orderId, {
            include: [
                {
                    model: Store,
                    as: 'store',
                },
            ],
        });

        if (!order) {
            throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
        }

        // Check if commission already exists
        const existingCommission = await CommissionTransaction.findOne({
            where: { order_id: orderId },
        });

        if (existingCommission) {
            return existingCommission;
        }

        // Calculate commission (category-based or global)
        const calculation = await this.calculateCommission(order);

        // Store item breakdown in notes for reference
        const notes = calculation.calculation_type === 'category_based'
            ? `Category-based calculation\n${JSON.stringify(calculation.item_breakdown, null, 2)}`
            : 'Global rate calculation';

        // Create transaction
        const transaction = await CommissionTransaction.create({
            order_id: orderId,
            store_id: order.store_id,
            setting_id: calculation.settings.id,
            order_total: calculation.order_total,
            commission_rate: calculation.commission_rate,
            commission_amount: calculation.commission_amount,
            seller_amount: calculation.seller_amount,
            platform_amount: calculation.platform_amount,
            status: 'calculated',
            calculated_at: new Date(),
            notes: notes,
        });

        return transaction;
    }

    /**
     * Get commission transaction for an order
     */
    async getCommissionByOrderId(orderId: string): Promise<CommissionTransactionInstance> {
        const transaction = await CommissionTransaction.findOne({
            where: { order_id: orderId },
            include: [
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'order_number', 'status', 'total'],
                },
                {
                    model: CommissionSettings,
                    as: 'settings',
                },
            ],
        });

        if (!transaction) {
            throw new ApiError(
                'Commission transaction not found',
                StatusCodes.NOT_FOUND
            );
        }

        return transaction;
    }

    /**
     * Get store's commission transactions
     */
    async getStoreCommissions(storeId: string, filters: CommissionFilters = {}): Promise<{
        transactions: CommissionTransactionInstance[];
        pagination: { total: number; page: number; limit: number; pages: number };
    }> {
        const {
            page = 1,
            limit = 20,
            status,
            startDate,
            endDate,
        } = filters;

        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: Record<string, unknown> = { store_id: storeId };

        if (status) {
            whereClause.status = status;
        }

        if (startDate && endDate) {
            whereClause.calculated_at = {
                [Op.between]: [new Date(startDate), new Date(endDate)],
            };
        }

        const { rows: transactions, count } = await CommissionTransaction.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'order_number', 'status', 'total', 'created_at'],
                },
            ],
            limit: Number(limit),
            offset,
            order: [['calculated_at', 'DESC']],
        });

        return {
            transactions,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(count / Number(limit)),
            },
        };
    }

    /**
     * Get store's commission summary
     */
    async getStoreSummary(storeId: string, startDate?: Date, endDate?: Date): Promise<unknown> {
        const summary = await CommissionTransaction.getStoreSummary(
            storeId,
            startDate,
            endDate
        );

        return summary;
    }

    /**
     * Get platform commission summary
     */
    async getPlatformSummary(startDate?: Date, endDate?: Date): Promise<unknown> {
        const summary = await CommissionTransaction.getPlatformSummary(
            startDate,
            endDate
        );

        return summary;
    }

    /**
     * Get all commission transactions (admin)
     */
    async getAllCommissions(filters: CommissionFilters = {}): Promise<{
        transactions: CommissionTransactionInstance[];
        pagination: { total: number; page: number; limit: number; pages: number };
    }> {
        const {
            page = 1,
            limit = 20,
            status,
            storeId,
            startDate,
            endDate,
        } = filters;

        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: Record<string, unknown> = {};

        if (status) {
            whereClause.status = status;
        }

        if (storeId) {
            whereClause.store_id = storeId;
        }

        if (startDate && endDate) {
            whereClause.calculated_at = {
                [Op.between]: [new Date(startDate), new Date(endDate)],
            };
        }

        const { rows: transactions, count } = await CommissionTransaction.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'order_number', 'status', 'total'],
                },
            ],
            limit: Number(limit),
            offset,
            order: [['calculated_at', 'DESC']],
        });

        return {
            transactions,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(count / Number(limit)),
            },
        };
    }

    /**
     * Create or update commission settings
     */
    async createOrUpdateSettings(settingsData: SettingsData): Promise<CommissionSettingsInstance> {
        const { store_id, ...data } = settingsData;

        // If updating store-specific settings
        if (store_id) {
            // Verify store exists
            const store = await Store.findByPk(store_id);
            if (!store) {
                throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
            }

            // Check if settings already exist
            const existing = await CommissionSettings.findOne({
                where: { store_id },
            });

            if (existing) {
                await existing.update(data);
                return existing;
            }
        }

        // Create new settings
        const settings = await CommissionSettings.create({
            store_id: store_id || null,
            ...data,
        });

        return settings;
    }

    /**
     * Get commission settings for a store
     */
    async getSettings(storeId: string | null = null): Promise<CommissionSettingsInstance | null> {
        const settings = await CommissionSettings.findOne({
            where: { store_id: storeId },
            order: [['created_at', 'DESC']],
        });

        if (!settings && storeId) {
            // Return global settings if no store-specific settings
            return this.getSettings(null);
        }

        return settings;
    }

    /**
     * Handle order refund - update commission transaction
     */
    async handleOrderRefund(orderId: string, refundAmount: number | null = null): Promise<CommissionTransactionInstance> {
        const transaction = await CommissionTransaction.findOne({
            where: { order_id: orderId },
        });

        if (!transaction) {
            throw new ApiError(
                'Commission transaction not found',
                StatusCodes.NOT_FOUND
            );
        }

        await transaction.markAsRefunded(refundAmount);

        return transaction;
    }

    /**
     * Mark commission as paid to seller
     */
    async markAsPaid(transactionId: string, paymentDetails: PaymentDetails): Promise<CommissionTransactionInstance> {
        const transaction = await CommissionTransaction.findByPk(transactionId);

        if (!transaction) {
            throw new ApiError(
                'Commission transaction not found',
                StatusCodes.NOT_FOUND
            );
        }

        await transaction.markAsPaid(
            paymentDetails.payment_method,
            paymentDetails.payment_reference,
            paymentDetails.payout_id
        );

        return transaction;
    }

    /**
     * Initialize default global settings if none exist
     */
    async initializeDefaultSettings(): Promise<CommissionSettingsInstance> {
        const existing = await CommissionSettings.findOne({
            where: { store_id: null },
        });

        if (existing) {
            return existing;
        }

        return CommissionSettings.createDefaultSettings();
    }

    async handleOrderPaid(event: OrderEvent | null): Promise<CommissionTransactionInstance | null> {
        if (!event || !event.orderId) {
            return null;
        }

        try {
            return await this.createCommissionTransaction(event.orderId);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[Commission Service] Failed to process commission for paid order', {
                orderId: event.orderId,
                error: errorMessage,
            });
            return null;
        }
    }

    async handleOrderFailed(event: OrderEvent | null): Promise<null> {
        if (!event || !event.orderId) {
            return null;
        }

        await CommissionTransaction.destroy({ where: { order_id: event.orderId } });
        return null;
    }
}

export = new CommissionService();
