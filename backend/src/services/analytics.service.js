const logger = require('../utils/logger');
const { ORDER_EVENTS } = require('../events/order.events');

class AnalyticsService {
  async track(eventType, payload) {
    logger.info(`[Analytics] ${eventType}`, payload);
  }

  async handleOrderEvent(eventType, payload) {
    await this.track(eventType, payload);

    if (eventType === ORDER_EVENTS.ORDER_COMPLETED) {
      logger.info('[Analytics] order.completed event processed', {
        orderId: payload?.orderId || null,
        userId: payload?.userId || null,
      });
    }
  }
}

module.exports = new AnalyticsService();
