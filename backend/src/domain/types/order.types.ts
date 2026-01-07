/**
 * Order Domain Types
 * Pure TypeScript interfaces - no framework dependencies
 */

import { IEntity, IShippingAddress } from './common.types';

/**
 * Order status enum - Phase 8.1 Fulfillment Flow
 * Canonical transitions:
 *   pending -> processing -> shipped -> delivered
 *   pending -> cancelled
 *   processing -> cancelled
 */
export enum OrderStatus {
    DRAFT = 'draft',           // Legacy, keep for backward compatibility
    PENDING = 'pending',       // Order placed, awaiting processing
    PROCESSING = 'processing', // Legacy alias for preparing
    PREPARING = 'preparing',   // Being prepared for shipment
    SHIPPED = 'shipped',       // In transit to customer
    DELIVERED = 'delivered',   // Successfully delivered
    COMPLETED = 'completed',   // Order completed (legacy flow)
    CONFIRMED = 'confirmed',   // Legacy alias (maps to processing)
    CANCELLED = 'cancelled',   // Order cancelled
}

/**
 * Allowed status transitions (single source of truth)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.DRAFT]: [OrderStatus.PENDING],
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.CANCELLED], // Legacy
    [OrderStatus.CANCELLED]: [],
};

/**
 * Payment status for orders
 */
export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

/**
 * Order item interface
 * All monetary values in CENTS (integer) - source of truth
 */
export interface IOrderItem {
    id: string;
    orderId: string;
    productId: string;
    vendorId: string;
    quantity: number;
    unitAmountCents: number;      // Price per unit in cents
    lineTotalAmountCents: number; // quantity * unitAmountCents
    currency: string;
    productSnapshot: IProductSnapshot;
}

export interface IOrderItemVariantSnapshot {
    id?: string;
    sku?: string;
    price?: number;
    stock?: number;
    selection?: Record<string, string>;
}

/**
 * Minimal product info stored with order for historical reference
 */
export interface IProductSnapshot {
    title: string;
    sku?: string;
    slug?: string;
    imageUrl?: string;
    image?: string | null;
    variant?: IOrderItemVariantSnapshot | null;
}

/**
 * Order interface
 * All monetary values in CENTS (integer) - source of truth
 */
export interface IOrder extends IEntity {
    orderNumber: string;
    userId: string | null;        // Null for guest checkout
    storeId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;

    // Items
    items: IOrderItem[];

    // Monetary values - ALL IN CENTS
    subtotalCents: number;
    shippingCostCents: number;
    discountCents: number;
    totalCents: number;
    currency: string;

    // Shipping
    shippingAddress: IShippingAddress;
    billingAddress?: IShippingAddress;

    // Shipping support fields (cents)
    shippingActualCostCents?: number;
    shippingCustomerPaidCents?: number;
    shippingStoreCoveredCents?: number;
    shippingPlatformCoveredCents?: number;
    shippingStoreOwesPlatformCents?: number;
    shippingRuleId?: string;

    // Coupon
    couponCode?: string;
    couponDiscountCents?: number;

    // Tracking
    trackingNumber?: string;
    carrier?: string;
    shippedAt?: Date;      // Set when status becomes shipped
    deliveredAt?: Date;    // Set when status becomes delivered

    // Notes
    customerNote?: string;
    cancellationReason?: string;
    cancelledAt?: Date;

    // Idempotency
    idempotencyKey?: string;
}

/**
 * Persistence-facing order model shape (snake_case from ORM)
 */
export interface IOrderRecord {
    id: string;
    store_id: string;
    user_id: string | null;
    status: OrderStatus;
    payment_status?: string;
    payment_details?: Record<string, unknown>;
    total?: number | string;
    cancellation_reason?: string | null;
    cancelled_at?: Date | null;
    save: () => Promise<void>;
    reload: () => Promise<void>;
}

/**
 * Input type for creating a new order
 */
export type CreateOrderInput = Omit<IOrder,
    'id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'items'
> & {
    items: Omit<IOrderItem, 'id' | 'orderId'>[];
};
