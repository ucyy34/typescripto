const eventBus = require('../events/eventBus');
const { ORDER_EVENTS } = require('../events/order.events');
const analyticsService = require('../services/analytics.service');

let initialized = false;

module.exports = () => {
  if (initialized) {
    return;
  }

  const track = async (eventType, payload) => {
    await analyticsService.trackEvent({
      eventType,
      orderId: payload.orderId,
      userId: payload.userId || null,
      timestamp: payload.timestamp,
    });
  };

  Object.values(ORDER_EVENTS).forEach((eventType) => {
    eventBus.subscribe(eventType, async (payload) => track(eventType, payload));
  });

  initialized = true;
};
