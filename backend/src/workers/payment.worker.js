const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const paymentService = require('../services/payment.service');

console.log('[Worker] PaymentWorker started');

eventBus.subscribe(ORDER_EVENTS.ORDER_CREATED, async (payload) => {
  await paymentService.handleOrderCreated(payload);
});

module.exports = true;
