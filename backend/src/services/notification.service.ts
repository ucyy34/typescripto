/**
 * Notification Service
 * Handles order-related notifications (email, push, etc.)
 * Currently a stub that logs notifications
 */

import logger from '../utils/logger';

// Types
type NotificationType =
    | 'order-created'
    | 'order-paid'
    | 'order-failed'
    | 'order-shipped'
    | 'order-completed';

type RecipientType = 'store' | 'customer' | 'admin';

interface Notification {
    type: NotificationType;
    orderId: string;
    storeId?: string | null;
    userId?: string;
    message: string;
    recipient: RecipientType;
    reason?: string;
    trackingNumber?: string | null;
    carrier?: string | null;
}

interface NotificationTransport {
    send(notification: Notification): Promise<unknown>;
}

interface OrderEvent {
    orderId: string;
    storeId?: string;
    userId?: string;
    reason?: string;
    trackingNumber?: string;
    carrier?: string;
}

class NotificationService {
    private transport: NotificationTransport;
    private sentNotifications: Map<string, Set<string>>;
    private finalizedOrders: Set<string>;

    constructor() {
        // Default stub transport - just logs
        this.transport = {
            async send(notification: Notification): Promise<void> {
                logger.info('Notification dispatched', notification);
            },
        };
        this.sentNotifications = new Map();
        this.finalizedOrders = new Set();
    }

    setTransport(transport: NotificationTransport): void {
        this.transport = transport;
    }

    private _shouldSend(orderId: string | undefined, eventType: string): boolean {
        if (!orderId) {
            return true;
        }

        if (this.finalizedOrders.has(orderId)) {
            return false;
        }

        const sentForOrder = this.sentNotifications.get(orderId) || new Set<string>();
        if (sentForOrder.has(eventType)) {
            return false;
        }

        sentForOrder.add(eventType);
        this.sentNotifications.set(orderId, sentForOrder);
        return true;
    }

    private _finalize(orderId: string | undefined): void {
        if (!orderId) {
            return;
        }

        this.finalizedOrders.add(orderId);
        this.sentNotifications.delete(orderId);
    }

    async handleOrderCreated(event: OrderEvent | null): Promise<unknown> {
        if (!event?.orderId || !this._shouldSend(event.orderId, 'order.created')) {
            return null;
        }

        return this.transport.send({
            type: 'order-created',
            orderId: event.orderId,
            storeId: event.storeId || null,
            message: 'Yeni sipariş aldınız',
            recipient: 'store',
        });
    }

    async handleOrderPaid(event: OrderEvent | null): Promise<unknown> {
        if (!event?.orderId || !this._shouldSend(event.orderId, 'order.paid')) {
            return null;
        }

        return this.transport.send({
            type: 'order-paid',
            orderId: event.orderId,
            userId: event.userId,
            message: 'Ödeme başarıyla alındı',
            recipient: 'customer',
        });
    }

    async handleOrderFailed(event: OrderEvent | null): Promise<unknown> {
        if (!event?.orderId || !this._shouldSend(event.orderId, 'order.failed')) {
            return null;
        }

        const result = await this.transport.send({
            type: 'order-failed',
            orderId: event.orderId,
            userId: event.userId,
            reason: event.reason || 'Payment failed',
            message: 'Ödeme işlemi başarısız oldu',
            recipient: 'customer',
        });

        this._finalize(event.orderId);

        return result;
    }

    async handleOrderShipped(event: OrderEvent | null): Promise<unknown> {
        if (!event?.orderId || !this._shouldSend(event.orderId, 'order.shipped')) {
            return null;
        }

        return this.transport.send({
            type: 'order-shipped',
            orderId: event.orderId,
            userId: event.userId,
            trackingNumber: event.trackingNumber || null,
            carrier: event.carrier || null,
            message: 'Siparişiniz kargoya verildi',
            recipient: 'customer',
        });
    }

    async handleOrderCompleted(event: OrderEvent | null): Promise<unknown> {
        if (!event?.orderId || !this._shouldSend(event.orderId, 'order.completed')) {
            return null;
        }

        logger.info('Notification dispatched for order completion', {
            orderId: event.orderId,
            userId: event.userId || null,
        });

        const result = await this.transport.send({
            type: 'order-completed',
            orderId: event.orderId,
            userId: event.userId,
            message: 'Siparişiniz teslim edildi',
            recipient: 'customer',
        });

        this._finalize(event.orderId);

        return result;
    }
}

export default new NotificationService();
