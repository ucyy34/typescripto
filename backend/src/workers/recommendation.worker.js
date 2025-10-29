const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const recommendationService = require('../services/recommendation.service');

console.log('[Worker] recommendation started');

eventBus.subscribe(ORDER_EVENTS.ORDER_COMPLETED, async (payload) => {
  await recommendationService.recordOrderCompletion(payload);
});

module.exports = true;
