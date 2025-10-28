'use strict';

const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const logger = require('../utils/logger');

class AnalyticsService {
  constructor({ bus = eventBus, log = logger } = {}) {
    this.bus = bus;
    this.logger = log;
    this.events = [];
  }

  register() {
    Object.values(ORDER_EVENTS).forEach((eventType) => {
      this.bus.subscribe(eventType, (payload) => this.track(eventType, payload), {
        workerId: `analytics-${eventType}`,
        concurrency: 1,
      });
    });
  }

  async track(eventType, payload) {
    this.logger.info('[AnalyticsService] Tracking %s', eventType, {
      orderId: payload.orderId,
      userId: payload.userId,
      version: payload.version,
    });
    this.events.push({ eventType, payload });
  }
}

module.exports = AnalyticsService;
