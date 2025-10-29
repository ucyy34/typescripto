const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.metricsByStore = new Map();
    this.processedEvents = new Set();
  }

  reset() {
    this.metricsByStore.clear();
    this.processedEvents.clear();
  }

  _getStoreKey(storeId) {
    return storeId || 'global';
  }

  _getMetrics(storeId) {
    const key = this._getStoreKey(storeId);
    if (!this.metricsByStore.has(key)) {
      this.metricsByStore.set(key, {
        ordersCreated: 0,
        ordersPaid: 0,
        ordersShipped: 0,
        ordersCompleted: 0,
        revenue: 0,
      });
    }

    return this.metricsByStore.get(key);
  }

  getMetrics(storeId) {
    return { ...this._getMetrics(storeId) };
  }

  async handleOrderEvent(eventType, payload) {
    const normalizedType = payload?.type || eventType;
    const orderId = payload?.orderId;

    if (!normalizedType || !orderId) {
      return;
    }

    const key = `${orderId}:${normalizedType}`;
    if (this.processedEvents.has(key)) {
      return;
    }
    this.processedEvents.add(key);

    const storeId = payload?.storeId;
    const metrics = this._getMetrics(storeId);

    switch (normalizedType) {
      case 'order.created':
        metrics.ordersCreated += 1;
        break;
      case 'order.paid': {
        metrics.ordersPaid += 1;
        const amount = parseFloat(payload?.total ?? 0) || 0;
        metrics.revenue = parseFloat((metrics.revenue + amount).toFixed(2));
        break;
      }
      case 'order.shipped':
        metrics.ordersShipped += 1;
        break;
      case 'order.completed':
        metrics.ordersCompleted += 1;
        break;
      default:
        break;
    }

    logger.info(`[Analytics] ${normalizedType}`, {
      orderId,
      storeId: this._getStoreKey(storeId),
      metrics: { ...metrics },
    });
  }
}

module.exports = new AnalyticsService();
