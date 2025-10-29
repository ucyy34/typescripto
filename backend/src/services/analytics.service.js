const logger = require('../utils/logger');
const { ORDER_EVENTS } = require('../events/order.events');

class AnalyticsService {
  constructor() {
    this.metricsByStore = new Map();
    this.processedEvents = new Map();
  }

  reset() {
    this.metricsByStore.clear();
    this.processedEvents.clear();
  }

  _getStoreMetrics(storeId) {
    const key = storeId || 'unknown';
    if (!this.metricsByStore.has(key)) {
      this.metricsByStore.set(key, {
        orders: 0,
        revenue: 0,
        completed: 0,
      });
    }

    return this.metricsByStore.get(key);
  }

  _markEvent(orderId, eventKey) {
    if (!orderId) {
      return true;
    }

    const processed = this.processedEvents.get(orderId) || new Set();
    if (processed.has(eventKey)) {
      return false;
    }

    processed.add(eventKey);
    this.processedEvents.set(orderId, processed);
    if (eventKey === ORDER_EVENTS.ORDER_COMPLETED || eventKey === ORDER_EVENTS.ORDER_FAILED) {
      this.processedEvents.delete(orderId);
    }

    return true;
  }

  async handleOrderEvent(eventType, payload = {}) {
    const type = eventType || payload.type;
    if (!type) {
      return null;
    }

    logger.info(`[Analytics] ${type}`, payload);

    const storeId = payload.storeId || 'unknown';
    const metrics = this._getStoreMetrics(storeId);

    if (type === ORDER_EVENTS.ORDER_CREATED && this._markEvent(payload.orderId, type)) {
      metrics.orders += 1;
    }

    if (type === ORDER_EVENTS.ORDER_PAID && this._markEvent(payload.orderId, type)) {
      const total = Number.parseFloat(payload.total ?? payload.amount ?? 0) || 0;
      metrics.revenue = parseFloat((metrics.revenue + total).toFixed(2));
    }

    if (type === ORDER_EVENTS.ORDER_COMPLETED && this._markEvent(payload.orderId, type)) {
      metrics.completed += 1;
      logger.info('[Analytics] order.completed handled', {
        orderId: payload?.orderId,
        userId: payload?.userId || null,
        storeId,
      });
    }

    return metrics;
  }

  getMetrics(storeId) {
    return this._getStoreMetrics(storeId);
  }
}

module.exports = new AnalyticsService();
