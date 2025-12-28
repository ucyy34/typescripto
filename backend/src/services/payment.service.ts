/**
 * Payment Service
 * Handles payment processing for orders
 */

import logger from '../utils/logger';
import { Order } from '../models';

// Import order events for publishing
const {
    publishOrderPaid,
    publishOrderFailed
} = require('../events/order.events');

// Types
interface PaymentGateway {
    charge(payload: OrderCreatedEvent): Promise<ChargeResult>;
}

interface ChargeResult {
    status: 'succeeded' | 'failed';
    transactionId?: string;
    reason?: string;
}

interface OrderCreatedEvent {
    orderId: string;
    userId?: string;
    storeId?: string;
    amount?: number;
}

interface PaymentPayload {
    transactionId?: string;
    paymentDetails?: ChargeResult;
}

class PaymentService {
    private gateway: PaymentGateway;

    constructor() {
        // Default stub gateway - auto-succeeds for testing
        this.gateway = {
            async charge(_payload: OrderCreatedEvent): Promise<ChargeResult> {
                return {
                    status: 'succeeded',
                    transactionId: `txn_${Date.now()}`,
                };
            },
        };
    }

    setGateway(gateway: PaymentGateway): void {
        this.gateway = gateway;
    }

    async handleOrderCreated(event: OrderCreatedEvent | null): Promise<unknown> {
        if (!event || !event.orderId) {
            return null;
        }

        try {
            const chargeResult = await this.gateway.charge(event);

            if (chargeResult.status !== 'succeeded') {
                return this.markPaymentFailed(event.orderId, chargeResult.reason || 'Payment failed');
            }

            return this.markPaymentSuccessful(event.orderId, {
                transactionId: chargeResult.transactionId,
                paymentDetails: chargeResult,
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Payment processing failed for order %s: %s', event.orderId, errorMessage);
            return this.markPaymentFailed(event.orderId, errorMessage);
        }
    }

    async markPaymentSuccessful(orderId: string, paymentPayload: PaymentPayload = {}): Promise<unknown> {
        // Update order status in DB
        await Order.update(
            { status: 'confirmed', payment_status: 'paid', paid_at: new Date() },
            { where: { id: orderId } }
        );

        // Publish order paid event
        publishOrderPaid({ orderId, ...paymentPayload });
        logger.info('Payment successful for order %s', orderId);
        return { orderId, status: 'paid', ...paymentPayload };
    }

    async markPaymentFailed(orderId: string, reason: string): Promise<unknown> {
        logger.warn('Marking order %s as failed: %s', orderId, reason);

        // Update order status in DB
        await Order.update(
            { status: 'cancelled', payment_status: 'failed', cancellation_reason: reason },
            { where: { id: orderId } }
        );

        // Publish order failed event
        publishOrderFailed({ orderId, reason });
        return { orderId, status: 'failed', reason };
    }
}

export = new PaymentService();
