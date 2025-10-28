const logger = require('../utils/logger');

class AnalyticsService {
  async track(eventType, payload) {
    logger.info(`[Analytics] ${eventType}`, payload);
  }

  async handleOrderEvent(eventType, payload) {
    await this.track(eventType, payload);
  }
}

module.exports = new AnalyticsService();
