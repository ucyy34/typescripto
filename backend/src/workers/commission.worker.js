const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const commissionService = require('../services/commission.service');

console.log('[Worker] CommissionWorker started');

eventBus.subscribe(ORDER_EVENTS.ORDER_PAID, async (payload) => {
  if (!payload || !payload.orderId) {
    return;
  }

  try {
    await commissionService.createCommissionTransaction(payload.orderId);
  } catch (error) {
    console.error('[Worker] CommissionWorker failed', {
      orderId: payload.orderId,
      error: error.message,
    });
  }
});

module.exports = true;
