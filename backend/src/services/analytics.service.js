const logger = require('../utils/logger');

const ORDER_EVENT_KEYS = {
  'order.created': 'created',
  'order.paid': 'paid',
  'order.shipped': 'shipped',
  'order.completed': 'completed',
};

class AnalyticsService {
  constructor() {
    this.storeMetrics = new Map();
  }

  _ensureStoreMetrics(storeId) {
    if (!storeId) {
      return null;
    }

    if (!this.storeMetrics.has(storeId)) {
      this.storeMetrics.set(storeId, {
        created: 0,
        paid: 0,
        completed: 0,
        revenue: 0,
        successRate: 0,
        processed: {
          created: new Set(),
          paid: new Set(),
          completed: new Set(),
        },
      });
    }

    return this.storeMetrics.get(storeId);
  }

  getStoreMetrics(storeId) {
    return this.storeMetrics.get(storeId) || null;
  }

  reset() {
    this.storeMetrics.clear();
  }

  async track(eventType, payload) {
    logger.info(`[Analytics] ${eventType}`, payload);
  }

  async handleOrderEvent(eventType, payload) {
    const normalizedType = typeof eventType === 'string' ? eventType : eventType?.type;
    const storeId = payload?.storeId || null;

    await this.track(normalizedType, payload);

    if (!storeId || !ORDER_EVENT_KEYS[normalizedType]) {
      return;
    }

    const metrics = this._ensureStoreMetrics(storeId);
    if (!metrics) {
      return;
    }

    const orderId = payload?.orderId;
    const key = ORDER_EVENT_KEYS[normalizedType];

    if (['created', 'paid', 'completed'].includes(key)) {
      const processedSet = metrics.processed[key];
      if (orderId && processedSet.has(orderId)) {
        return;
      }

      if (orderId) {
        processedSet.add(orderId);
      }
    }

    if (key === 'created') {
      metrics.created += 1;
    }

    if (key === 'paid') {
      metrics.paid += 1;
      metrics.revenue = parseFloat((metrics.revenue + (payload?.total || 0)).toFixed(2));
    }

    if (key === 'completed') {
      metrics.completed += 1;
    }

    if (metrics.created > 0) {
      metrics.successRate = parseFloat((metrics.completed / metrics.created).toFixed(4));
    }
  }
}

module.exports = new AnalyticsService();
