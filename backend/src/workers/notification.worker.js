const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const notificationService = require('../services/notification.service');

eventBus.subscribe(ORDER_EVENTS.ORDER_PAID, async (payload) => {
  await notificationService.handleOrderPaid(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_FAILED, async (payload) => {
  await notificationService.handleOrderFailed(payload);
});

module.exports = true;
