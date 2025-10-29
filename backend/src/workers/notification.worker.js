const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const notificationService = require('../services/notification.service');

console.log('[Worker] notification started');

eventBus.subscribe(ORDER_EVENTS.ORDER_CREATED, async (payload) => {
  await notificationService.handleOrderCreated(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_PAID, async (payload) => {
  await notificationService.handleOrderPaid(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_SHIPPED, async (payload) => {
  await notificationService.handleOrderShipped(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_FAILED, async (payload) => {
  await notificationService.handleOrderFailed(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_COMPLETED, async (payload) => {
  await notificationService.handleOrderCompleted(payload);
});

module.exports = true;
