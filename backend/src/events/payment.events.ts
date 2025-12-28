/**
 * Payment Events
 * Payment-related event types and publishers
 */

import eventBus from './eventBus';

const PAYMENT_EVENTS = {
    REQUESTED: 'payment.requested',
    SUCCEEDED: 'payment.succeeded',
    FAILED: 'payment.failed',
} as const;

interface PaymentEventPayload {
    version?: number;
    [key: string]: unknown;
}

const publishPaymentEvent = (type: string, payload: PaymentEventPayload): Promise<void> =>
    eventBus.publish(type, {
        ...payload,
        version: payload.version || Date.now(),
    });

export { PAYMENT_EVENTS, publishPaymentEvent };

// CommonJS compatibility
module.exports = {
    PAYMENT_EVENTS,
    publishPaymentEvent,
};
