const logger = require('../utils/logger');
const eventBus = require('../events/eventBus');
const { ORDER_EVENTS } = require('../events/order.events');

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.registerConsumers();
  }

  registerConsumers() {
    if (this.initialized || process.env.EVENT_CONSUMERS_DISABLED === 'true') {
      return;
    }

    const trackableEvents = [ORDER_EVENTS.PAID, ORDER_EVENTS.SHIPPED, ORDER_EVENTS.COMPLETED];

    trackableEvents.forEach((event) => {
      eventBus.subscribe(event, async (payload) => {
        await this.trackEvent(event, payload);
      });
    });

    this.initialized = true;
  }

  async trackEvent(event, payload) {
    logger.info('Analytics event %s', event, payload);
  }
}

const analyticsService = new AnalyticsService();

module.exports = analyticsService;
module.exports.AnalyticsService = AnalyticsService;
