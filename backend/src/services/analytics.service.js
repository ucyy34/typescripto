const logger = require('../utils/logger');

class AnalyticsService {
  async track(eventType, payload) {
    logger.info(`[Analytics] ${eventType}`, payload);
  }

  async handleOrderEvent(eventType, payload) {
    await this.track(eventType, payload);

    if (eventType === 'order.completed' || eventType?.type === 'order.completed') {
      logger.info('[Analytics] order.completed handled', {
        orderId: payload?.orderId,
        userId: payload?.userId || null,
      });
    }
  }
}

module.exports = new AnalyticsService();
