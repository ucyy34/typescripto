/**
 * Payment Worker
 * Subscribe to order events and handle payment processing
 */

import { ORDER_EVENTS } from '../events/order.events';
import eventBus from '../events/eventBus';
import paymentService from '../services/payment.service';

console.log('[Worker] payment started');

eventBus.subscribe(ORDER_EVENTS.ORDER_CREATED, async (payload: unknown) => {
    await (paymentService as any).handleOrderCreated(payload);
});

export default true;

// CommonJS compatibility
module.exports = true;
