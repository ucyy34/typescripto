/**
 * Sequelize Order Repository
 * Implements IOrderRepository using Sequelize ORM
 */

import { IOrderRepository, IOrderQueryOptions } from '../../domain/interfaces/IOrderRepository';
import { IOrder, OrderStatus } from '../../domain/types/order.types';
import { IPaginatedResult } from '../../domain/types/common.types';
import { OrderMapper } from '../mappers/OrderMapper';
import { NotFoundError } from '../../shared/errors';

// Import Sequelize models (existing JS models)
const { Order, OrderItem } = require('../../models');

/**
 * Default include for order queries
 */
const DEFAULT_INCLUDE = [
    {
        model: OrderItem,
        as: 'items',
        required: false,
    }
];

export class SequelizeOrderRepository implements IOrderRepository {
    /**
     * Find order by ID
     */
    async findById(id: string): Promise<IOrder | null> {
        const order = await Order.findByPk(id, {
            include: DEFAULT_INCLUDE,
        });

        return order ? OrderMapper.toDomain(order) : null;
    }

    /**
     * Find order by idempotency key
     */
    async findByIdempotencyKey(key: string): Promise<IOrder | null> {
        const order = await Order.findOne({
            where: { idempotency_key: key },
            include: DEFAULT_INCLUDE,
        });

        return order ? OrderMapper.toDomain(order) : null;
    }

    /**
     * Find orders for a user
     */
    async findByUserId(
        userId: string,
        options: IOrderQueryOptions = {}
    ): Promise<IPaginatedResult<IOrder>> {
        const { page = 1, limit = 20, status } = options;
        const offset = (page - 1) * limit;

        const where: Record<string, unknown> = { user_id: userId };
        if (status) where.status = status;

        const { rows, count } = await Order.findAndCountAll({
            where,
            include: DEFAULT_INCLUDE,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        return {
            data: rows.map(OrderMapper.toDomain),
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Find orders for a store (vendor view)
     */
    async findByStoreId(
        storeId: string,
        options: IOrderQueryOptions = {}
    ): Promise<IPaginatedResult<IOrder>> {
        const { page = 1, limit = 20, status } = options;
        const offset = (page - 1) * limit;

        const where: Record<string, unknown> = { store_id: storeId };
        if (status) where.status = status;

        const { rows, count } = await Order.findAndCountAll({
            where,
            include: DEFAULT_INCLUDE,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        return {
            data: rows.map(OrderMapper.toDomain),
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Create a new order with items
     */
    async create(
        orderData: Omit<IOrder, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber'>
    ): Promise<IOrder> {
        // Generate order number
        const orderNumber = await this.generateOrderNumber();

        const persistData = {
            ...OrderMapper.toPersistence(orderData),
            order_number: orderNumber,
        };

        // Create order with items in transaction
        const order = await Order.create(persistData, {
            include: [{ model: OrderItem, as: 'items' }],
        });

        // Reload with associations
        await order.reload({ include: DEFAULT_INCLUDE });

        return OrderMapper.toDomain(order);
    }

    // NOTE: updateStatus moved to Phase 8.1 section below with enhanced timestamp handling

    /**
     * Save changes to an existing order
     */
    async save(order: IOrder): Promise<IOrder> {
        const existing = await Order.findByPk(order.id);

        if (!existing) {
            throw new NotFoundError('Order', order.id);
        }

        const updateData = OrderMapper.toPersistence(order);
        await existing.update(updateData);
        await existing.reload({ include: DEFAULT_INCLUDE });

        return OrderMapper.toDomain(existing);
    }

    // ==========================================
    // PHASE 8.1: FULFILLMENT METHODS
    // ==========================================

    /**
     * Update order status with timestamp handling
     * @param id Order ID
     * @param newStatus New status value
     * @returns Updated order
     */
    async updateStatus(id: string, newStatus: OrderStatus): Promise<IOrder> {
        const order = await Order.findByPk(id, {
            include: DEFAULT_INCLUDE,
        });

        if (!order) {
            throw new NotFoundError(`Order ${id} not found`);
        }

        const updateData: Record<string, unknown> = { status: newStatus };

        // Set timestamps based on status
        if (newStatus === OrderStatus.SHIPPED && !order.shipped_at) {
            updateData.shipped_at = new Date();
        }
        if (newStatus === OrderStatus.DELIVERED && !order.delivered_at) {
            updateData.delivered_at = new Date();
        }
        if (newStatus === OrderStatus.CANCELLED && !order.cancelled_at) {
            updateData.cancelled_at = new Date();
        }

        await order.update(updateData);
        await order.reload({ include: DEFAULT_INCLUDE });

        return OrderMapper.toDomain(order);
    }

    /**
     * Update order tracking info
     * Auto-sets status to shipped and shippedAt if not already
     * @param id Order ID
     * @param carrier Carrier name
     * @param trackingNumber Tracking number
     * @returns Updated order
     */
    async updateTracking(
        id: string,
        carrier: string,
        trackingNumber: string
    ): Promise<IOrder> {
        const order = await Order.findByPk(id, {
            include: DEFAULT_INCLUDE,
        });

        if (!order) {
            throw new NotFoundError(`Order ${id} not found`);
        }

        const updateData: Record<string, unknown> = {
            carrier,
            tracking_number: trackingNumber,
        };

        // Auto-set shipped status and timestamp if not already
        if (order.status !== 'shipped' && order.status !== 'delivered') {
            updateData.status = 'shipped';
        }
        if (!order.shipped_at) {
            updateData.shipped_at = new Date();
        }

        await order.update(updateData);
        await order.reload({ include: DEFAULT_INCLUDE });

        return OrderMapper.toDomain(order);
    }

    /**
     * Get order with store info for role-based access check
     */
    async findByIdWithStore(id: string): Promise<{ order: IOrder; storeId: string } | null> {
        const order = await Order.findByPk(id, {
            include: DEFAULT_INCLUDE,
        });

        if (!order) return null;

        return {
            order: OrderMapper.toDomain(order),
            storeId: order.store_id,
        };
    }

    /**
     * Generate unique order number
     */
    private async generateOrderNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;

        // Find the latest order number for this year
        const latestOrder = await Order.findOne({
            where: {
                order_number: {
                    [require('sequelize').Op.like]: `${prefix}%`,
                },
            },
            order: [['created_at', 'DESC']],
        });

        let sequence = 1;
        if (latestOrder?.order_number) {
            const lastSequence = parseInt(latestOrder.order_number.replace(prefix, ''), 10);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }

        return `${prefix}${String(sequence).padStart(5, '0')}`;
    }
}

// Singleton instance
let instance: SequelizeOrderRepository | null = null;

export function getOrderRepository(): IOrderRepository {
    if (!instance) {
        instance = new SequelizeOrderRepository();
    }
    return instance;
}
