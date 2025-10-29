const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.transport = {
      async send(notification) {
        logger.info('Notification dispatched', notification);
      },
    };
    this.sentNotifications = new Map();
    this.deduplicationTtlMs = 60 * 60 * 1000; // 1 hour
    this.deduplicationLimit = 5000;
  }

  setTransport(transport) {
    this.transport = transport;
  }

  _buildKey(eventType, orderId) {
    if (!eventType || !orderId) {
      return null;
    }

    return `${eventType}:${orderId}`;
  }

  _pruneDedupCache(now = Date.now()) {
    if (this.sentNotifications.size === 0) {
      return;
    }

    for (const [key, timestamp] of this.sentNotifications.entries()) {
      if (now - timestamp > this.deduplicationTtlMs || this.sentNotifications.size > this.deduplicationLimit) {
        this.sentNotifications.delete(key);
      } else if (this.sentNotifications.size <= this.deduplicationLimit) {
        break;
      }
    }
  }

  _shouldSend(eventType, orderId) {
    const key = this._buildKey(eventType, orderId);

    if (!key) {
      return true;
    }

    const now = Date.now();
    this._pruneDedupCache(now);

    if (this.sentNotifications.has(key)) {
      return false;
    }

    this.sentNotifications.set(key, now);
    return true;
  }

  async handleOrderCreated(event) {
    if (!event || !event.orderId || !this._shouldSend('order.created', event.orderId)) {
      return null;
    }

    return this.transport.send({
      type: 'order-created',
      orderId: event.orderId,
      storeId: event.storeId || null,
      message: 'Yeni sipariş aldınız',
      recipient: {
        type: 'store-owner',
        storeId: event.storeId || null,
      },
    });
  }

  async handleOrderPaid(event) {
    if (!event || !event.orderId || !this._shouldSend('order.paid', event.orderId)) {
      return null;
    }

    return this.transport.send({
      type: 'order-paid',
      orderId: event.orderId,
      userId: event.userId,
      message: 'Payment completed successfully',
    });
  }

  async handleOrderFailed(event) {
    if (!event || !event.orderId || !this._shouldSend('order.failed', event.orderId)) {
      return null;
    }

    return this.transport.send({
      type: 'order-failed',
      orderId: event.orderId,
      userId: event.userId,
      reason: event.reason || 'Payment failed',
      message: 'Payment attempt failed',
    });
  }

  async handleOrderCompleted(event) {
    if (!event || !event.orderId || !this._shouldSend('order.completed', event.orderId)) {
      return null;
    }

    logger.info('Notification dispatched for order completion', {
      orderId: event.orderId,
      userId: event.userId || null,
    });

    return this.transport.send({
      type: 'order-completed',
      orderId: event.orderId,
      userId: event.userId,
      message: 'Order has been completed successfully',
    });
  }

  async handleOrderShipped(event) {
    if (!event || !event.orderId || !this._shouldSend('order.shipped', event.orderId)) {
      return null;
    }

    return this.transport.send({
      type: 'order-shipped',
      orderId: event.orderId,
      userId: event.userId || null,
      message: 'Siparişiniz kargoya verildi',
      trackingNumber: event.trackingNumber || null,
      carrier: event.carrier || null,
    });
  }
}

module.exports = new NotificationService();
