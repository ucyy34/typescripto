/**
 * Notification Worker
 * Subscribe to order events and send notifications
 */

import { ORDER_EVENTS } from '../events/order.events';
import eventBus from '../events/eventBus';
import notificationService from '../services/notification.service';

console.log('[Worker] NotificationWorker started');

eventBus.subscribe(ORDER_EVENTS.ORDER_PAID, async (payload: unknown) => {
    await (notificationService as any).handleOrderPaid(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_CREATED, async (payload: unknown) => {
    await (notificationService as any).handleOrderCreated(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_FAILED, async (payload: unknown) => {
    await (notificationService as any).handleOrderFailed(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_SHIPPED, async (payload: unknown) => {
    await (notificationService as any).handleOrderShipped(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_COMPLETED, async (payload: unknown) => {
    await (notificationService as any).handleOrderCompleted(payload);
});

export default true;

// CommonJS compatibility
module.exports = true;
