/**
 * Event Bus
 * In-memory event publish/subscribe system
 * 
 * NOTE: This is a simplified in-memory implementation.
 * For production scaling with multiple server instances, 
 * consider adding Redis-based pub/sub or a message queue.
 */

const { EventEmitter } = require('events');
const eventLogger = require('../utils/eventLogger');

const EVENTS_QUEUE_NAME = 'events';

const orderEventSequences = new Map();
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
const publish = async (type, payload = {}) => {
  const enrichedPayload = {
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
const subscribe = (type, handler) => {
  if (typeof handler !== 'function') {
    throw new TypeError('Event handler must be a function');
  }

  const listener = (payload) => {
    Promise.resolve()
      .then(() => handler(payload))
      .catch((error) => {
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
const once = (type, handler) => {
  if (typeof handler !== 'function') {
    throw new TypeError('Event handler must be a function');
  }

  emitter.once(type, handler);
};

/**
 * Remove all listeners for an event type
 * @param {string} type - Event type
 */
const removeAllListeners = (type) => {
  emitter.removeAllListeners(type);
};

module.exports = {
  publish,
  subscribe,
  once,
  removeAllListeners,
  EVENTS_QUEUE_NAME,
  // Legacy exports for compatibility
  ensureQueue: () => null,
  getScheduler: () => null,
};
