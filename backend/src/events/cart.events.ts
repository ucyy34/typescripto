/**
 * Cart Events
 * Cart-related event types and publishers
 */

import eventBus from './eventBus';

const CART_EVENTS = {
    UPDATED: 'cart.updated',
    MERGED: 'cart.merged',
    CHECKED_OUT: 'cart.checkedout',
} as const;

interface CartEventPayload {
    version?: number;
    [key: string]: unknown;
}

const publishCartEvent = (type: string, payload: CartEventPayload): Promise<void> =>
    eventBus.publish(type, {
        ...payload,
        version: payload.version || Date.now(),
    });

export { CART_EVENTS, publishCartEvent };

// CommonJS compatibility
module.exports = {
    CART_EVENTS,
    publishCartEvent,
};
