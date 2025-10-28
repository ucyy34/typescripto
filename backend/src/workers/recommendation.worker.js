'use strict';

const recommendationService = require('../services/recommendation.service');
const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');

eventBus.subscribe(
  ORDER_EVENTS.COMPLETED,
  (payload) => recommendationService.handleOrderCompletedEvent(payload),
  {
    workerId: 'recommendation-service',
    concurrency: 1,
  }
);

eventBus.subscribe(
  ORDER_EVENTS.PAID,
  (payload) => recommendationService.handleOrderCompletedEvent({ ...payload, userId: payload.userId }),
  {
    workerId: 'recommendation-cache-prime',
    concurrency: 1,
  }
);

module.exports = recommendationService;
