/**
 * Analytics Worker
 * Subscribe to order events and track analytics
 */

import { ORDER_EVENTS } from '../events/order.events';
import eventBus from '../events/eventBus';
import analyticsService from '../services/analytics.service';

console.log('[Worker] analytics started');

Object.values(ORDER_EVENTS).forEach((eventType) => {
    eventBus.subscribe(eventType, async (payload: unknown) => {
        await (analyticsService as any).handleOrderEvent(eventType, payload);
    });
});

export default true;

// CommonJS compatibility
module.exports = true;
