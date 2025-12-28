/**
 * Order Events
 * Order-related event types and publishers
 */

import eventBus from './eventBus';

const ORDER_EVENTS = {
    ORDER_CREATED: 'order.created',
    ORDER_PAID: 'order.paid',
    ORDER_SHIPPED: 'order.shipped',
    ORDER_COMPLETED: 'order.completed',
    ORDER_FAILED: 'order.failed',
} as const;

interface OrderEventPayload {
    orderId: string;
    userId?: string | null;
    storeId?: string | null;
    status?: string;
    paymentStatus?: string;
    total?: number;
    currency?: string;
    version?: number;
    timestamp?: string;
    [key: string]: unknown;
}

interface OrderLike {
    id: string;
    user_id?: string | null;
    store_id?: string | null;
    status?: string;
    payment_status?: string;
    total?: number | string;
    currency?: string;
}

const publishOrderEvent = async (type: string, payload: OrderEventPayload): Promise<void> => {
    if (!payload || !payload.orderId) {
        throw new Error(`Invalid payload for ${type}`);
    }

    await eventBus.publish(type, payload);
};

const serializeOrderForEvent = (order: OrderLike, overrides: Partial<OrderEventPayload> = {}): OrderEventPayload => {
    if (!order) {
        throw new Error('Order entity is required to serialize event payload');
    }

    return {
        orderId: order.id,
        userId: order.user_id || null,
        storeId: order.store_id || null,
        status: order.status,
        paymentStatus: order.payment_status,
        total: parseFloat(String(order.total || 0)),
        currency: order.currency || 'TRY',
        version: overrides.version || Date.now(),
        timestamp: new Date().toISOString(),
        ...overrides,
    };
};

export {
    ORDER_EVENTS,
    serializeOrderForEvent,
};

export const publishOrderCreated = (payload: OrderEventPayload): Promise<void> =>
    publishOrderEvent(ORDER_EVENTS.ORDER_CREATED, payload);
export const publishOrderPaid = (payload: OrderEventPayload): Promise<void> =>
    publishOrderEvent(ORDER_EVENTS.ORDER_PAID, payload);
export const publishOrderShipped = (payload: OrderEventPayload): Promise<void> =>
    publishOrderEvent(ORDER_EVENTS.ORDER_SHIPPED, payload);
export const publishOrderCompleted = (payload: OrderEventPayload): Promise<void> =>
    publishOrderEvent(ORDER_EVENTS.ORDER_COMPLETED, payload);
export const publishOrderFailed = (payload: OrderEventPayload): Promise<void> =>
    publishOrderEvent(ORDER_EVENTS.ORDER_FAILED, payload);

// CommonJS compatibility
module.exports = {
    ORDER_EVENTS,
    publishOrderCreated,
    publishOrderPaid,
    publishOrderShipped,
    publishOrderCompleted,
    publishOrderFailed,
    serializeOrderForEvent,
};
