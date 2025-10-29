const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const commissionService = require('../services/commission.service');

console.log('[Worker] CommissionWorker started');

eventBus.subscribe(ORDER_EVENTS.ORDER_PAID, async (payload) => {
  await commissionService.handleOrderPaid(payload);
});

eventBus.subscribe(ORDER_EVENTS.ORDER_FAILED, async (payload) => {
  await commissionService.handleOrderFailed?.(payload);
});

module.exports = true;
