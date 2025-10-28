const eventBus = require('../events/eventBus');
const { ORDER_EVENTS } = require('../events/order.events');
const recommendationService = require('../services/recommendation.service');

let initialized = false;

module.exports = () => {
  if (initialized) {
    return;
  }

  eventBus.subscribe(ORDER_EVENTS.COMPLETED, async (payload) => {
    await recommendationService.recordOrderCompletion({
      userId: payload.userId,
      items: payload.items || [],
    });
  });

  initialized = true;
};
