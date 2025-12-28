/**
 * Order Repository Interface
 * Abstracts data access for Order aggregate
 */

import { IOrder, OrderStatus } from '../types/order.types';
import { IPaginationOptions, IPaginatedResult } from '../types/common.types';

/**
 * Query options specific to orders
 */
export interface IOrderQueryOptions extends IPaginationOptions {
    status?: OrderStatus;
    storeId?: string;
    userId?: string;
}

/**
 * Order repository interface
 * Implementations: SequelizeOrderRepository
 */
export interface IOrderRepository {
    /**
     * Find order by ID
     */
    findById(id: string): Promise<IOrder | null>;

    /**
     * Find order by idempotency key (for duplicate prevention)
     */
    findByIdempotencyKey(key: string): Promise<IOrder | null>;

    /**
     * Find orders for a specific user
     */
    findByUserId(userId: string, options?: IOrderQueryOptions): Promise<IPaginatedResult<IOrder>>;

    /**
     * Find orders for a specific store (vendor view)
     */
    findByStoreId(storeId: string, options?: IOrderQueryOptions): Promise<IPaginatedResult<IOrder>>;

    /**
     * Create a new order with items
     */
    create(order: Omit<IOrder, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber'>): Promise<IOrder>;

    /**
     * Update order status (with optional cancellation reason)
     */
    updateStatus(id: string, status: OrderStatus, cancellationReason?: string): Promise<IOrder>;

    /**
     * Save changes to an existing order
     */
    save(order: IOrder): Promise<IOrder>;

    // ==========================================
    // PHASE 8.1: FULFILLMENT METHODS
    // ==========================================

    /**
     * Update order tracking info
     * Auto-sets status to shipped and shippedAt if not already
     */
    updateTracking(id: string, carrier: string, trackingNumber: string): Promise<IOrder>;

    /**
     * Find order with store ID for role-based access check
     */
    findByIdWithStore(id: string): Promise<{ order: IOrder; storeId: string } | null>;
}
