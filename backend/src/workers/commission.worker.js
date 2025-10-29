const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const commissionService = require('../services/commission.service');

console.log('[Worker] CommissionWorker started');

eventBus.subscribe(ORDER_EVENTS.ORDER_PAID, async (payload) => {
  if (!payload?.orderId) {
    return;
  }

  try {
    await commissionService.createCommissionTransaction(payload.orderId);
  } catch (error) {
    console.error('[CommissionWorker] Failed to create commission transaction', {
      orderId: payload.orderId,
      error: error.message,
    });
  }
});

module.exports = true;
