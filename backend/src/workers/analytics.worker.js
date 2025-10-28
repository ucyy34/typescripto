const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const analyticsService = require('../services/analytics.service');

const workerName = 'AnalyticsWorker';
console.log(`[Worker] ${workerName} started`);

Object.values(ORDER_EVENTS).forEach((eventType) => {
  eventBus.subscribe(eventType, async (payload) => {
    await analyticsService.handleOrderEvent(eventType, payload);
  });
});

module.exports = true;
