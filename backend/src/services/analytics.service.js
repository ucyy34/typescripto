const logger = require('../utils/logger');
const { ORDER_EVENTS } = require('../events/order.events');

const TERMINAL_ANALYTICS_EVENTS = new Set([
  ORDER_EVENTS.ORDER_COMPLETED,
  ORDER_EVENTS.ORDER_FAILED,
  'order.cancelled',
]);

class AnalyticsService {
  constructor() {
    this.metricsByStore = new Map();
    this.processedEvents = new Map();
    this.finalizedOrders = new Set();
  }

  reset() {
    this.metricsByStore.clear();
    this.processedEvents.clear();
    this.finalizedOrders.clear();
  }

  getMetrics(storeId = null) {
    if (storeId) {
      const metrics = this.metricsByStore.get(storeId) || {
        ordersCreated: 0,
        revenue: 0,
        completedOrders: 0,
      };
      return { [storeId]: { ...metrics } };
    }

    const snapshot = {};
    for (const [id, metrics] of this.metricsByStore.entries()) {
      snapshot[id] = { ...metrics };
    }
    return snapshot;
  }

  _ensureStoreMetrics(storeId) {
    if (!storeId) {
      return null;
    }

    if (!this.metricsByStore.has(storeId)) {
      this.metricsByStore.set(storeId, {
        ordersCreated: 0,
        revenue: 0,
        completedOrders: 0,
      });
    }

    return this.metricsByStore.get(storeId);
  }

  _shouldProcess(orderId, eventType) {
    if (!orderId || !eventType) {
      return false;
    }

    if (this.finalizedOrders.has(orderId)) {
      return false;
    }

    let events = this.processedEvents.get(orderId);
    if (!events) {
      events = new Set();
      this.processedEvents.set(orderId, events);
    }

    if (events.has(eventType)) {
      return false;
    }

    events.add(eventType);

    if (TERMINAL_ANALYTICS_EVENTS.has(eventType)) {
      this.finalizedOrders.add(orderId);
      this.processedEvents.delete(orderId);
    }

    return true;
  }

  async handleOrderEvent(eventType, payload) {
    const normalizedEvent = eventType || payload?.type;
    const orderId = payload?.orderId || null;
    const storeId = payload?.storeId || null;

    if (!normalizedEvent || !storeId || !this._shouldProcess(orderId, normalizedEvent)) {
      return;
    }

    const metrics = this._ensureStoreMetrics(storeId);
    if (!metrics) {
      return;
    }

    logger.info(`[Analytics] ${normalizedEvent}`, {
      orderId,
      storeId,
      total: payload?.total || null,
    });

    switch (normalizedEvent) {
      case ORDER_EVENTS.ORDER_CREATED:
        metrics.ordersCreated += 1;
        break;
      case ORDER_EVENTS.ORDER_PAID:
        metrics.revenue = parseFloat(
          (metrics.revenue + (parseFloat(payload?.total) || 0)).toFixed(2)
        );
        break;
      case ORDER_EVENTS.ORDER_COMPLETED:
        metrics.completedOrders += 1;
        break;
      default:
        break;
    }
  }
}

module.exports = new AnalyticsService();
