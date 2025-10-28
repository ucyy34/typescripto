const eventBus = require('../events/eventBus');
const { ORDER_EVENTS } = require('../events/order.events');
const notificationService = require('../services/notification.service');

let initialized = false;

module.exports = () => {
  if (initialized) {
    return;
  }

  eventBus.subscribe(ORDER_EVENTS.PAID, async (payload) => {
    await notificationService.notifyPaymentSuccess(payload);
  });

  eventBus.subscribe(ORDER_EVENTS.FAILED, async (payload) => {
    await notificationService.notifyPaymentFailure(payload);
  });

  eventBus.subscribe(ORDER_EVENTS.SHIPPED, async (payload) => {
    await notificationService.notifyOrderShipped(payload);
  });

  initialized = true;
};
