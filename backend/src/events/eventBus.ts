/**
 * Event Bus
 * In-memory event publish/subscribe system
 * 
 * NOTE: This is a simplified in-memory implementation.
 * For production scaling with multiple server instances, 
 * consider adding Redis-based pub/sub or a message queue.
 */

import { EventEmitter } from 'events';
import eventLogger from '../utils/eventLogger';

const EVENTS_QUEUE_NAME = 'events';

type EventHandler = (payload: unknown) => void | Promise<void>;

interface Subscription {
    close: () => void;
}

interface EventPayload {
    type?: string;
    version?: number;
    timestamp?: string;
    orderId?: string;
    [key: string]: unknown;
}

const orderEventSequences = new Map<string, string[]>();
const TERMINAL_EVENTS = new Set([
    'order.completed',
    'order.failed',
    'order.cancelled',
    'order.refunded',
]);

const emitter = new EventEmitter();
emitter.setMaxListeners(50); // Allow more listeners for multiple event types

/**
 * Publish an event
 * @param {string} type - Event type (e.g., 'order.created')
 * @param {Object} payload - Event data
 */
const publish = async (type: string, payload: EventPayload = {}): Promise<void> => {
    const enrichedPayload: EventPayload = {
        ...payload,
        type,
        version: payload.version ?? Date.now(),
        timestamp: payload.timestamp ?? new Date().toISOString(),
    };

    // Track order event sequences for debugging
    if (enrichedPayload.orderId) {
        const sequence = orderEventSequences.get(enrichedPayload.orderId) || [];
        sequence.push(type);
        orderEventSequences.set(enrichedPayload.orderId, sequence);
        eventLogger.info(`[EventBus] ${sequence.join(' → ')}`, {
            orderId: enrichedPayload.orderId,
            lastEvent: type,
        });

        // Clean up completed order sequences
        if (TERMINAL_EVENTS.has(type)) {
            orderEventSequences.delete(enrichedPayload.orderId);
        }
    } else {
        eventLogger.info(type, enrichedPayload);
    }

    // Emit asynchronously to avoid blocking
    process.nextTick(() => {
        emitter.emit(type, enrichedPayload);
    });
};

/**
 * Subscribe to an event
 * @param {string} type - Event type to listen for
 * @param {Function} handler - Event handler function
 * @returns {Object} Subscription with close() method
 */
const subscribe = (type: string, handler: EventHandler): Subscription => {
    if (typeof handler !== 'function') {
        throw new TypeError('Event handler must be a function');
    }

    const listener = (payload: unknown): void => {
        Promise.resolve()
            .then(() => handler(payload))
            .catch((error: Error) => {
                console.error(`[EventBus] Handler for ${type} failed:`, error.message);
            });
    };

    emitter.on(type, listener);

    return {
        close: () => emitter.off(type, listener),
    };
};

/**
 * Subscribe to an event once
 * @param {string} type - Event type to listen for
 * @param {Function} handler - Event handler function
 */
const once = (type: string, handler: EventHandler): void => {
    if (typeof handler !== 'function') {
        throw new TypeError('Event handler must be a function');
    }

    emitter.once(type, handler);
};

/**
 * Remove all listeners for an event type
 * @param {string} type - Event type
 */
const removeAllListeners = (type: string): void => {
    emitter.removeAllListeners(type);
};

const eventBus = {
    publish,
    subscribe,
    once,
    removeAllListeners,
    EVENTS_QUEUE_NAME,
    // Legacy exports for compatibility
    ensureQueue: (): null => null,
    getScheduler: (): null => null,
};

export default eventBus;
export { publish, subscribe, once, removeAllListeners, EVENTS_QUEUE_NAME };

// CommonJS compatibility
module.exports = eventBus;
