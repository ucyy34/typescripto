const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.transport = {
      async send(notification) {
        logger.info('Notification dispatched', notification);
      },
    };
    this.processedEventKeys = new Set();
  }

  setTransport(transport) {
    this.transport = transport;
  }

  reset() {
    this.processedEventKeys.clear();
  }

  _shouldDispatch(eventType, event) {
    if (!event || !event.orderId) {
      return false;
    }

    const key = `${event.orderId}:${eventType}`;
    if (this.processedEventKeys.has(key)) {
      return false;
    }

    this.processedEventKeys.add(key);
    return true;
  }

  async handleOrderCreated(event) {
    if (!this._shouldDispatch('order.created', event)) {
      return null;
    }

    const notification = {
      type: 'order-created',
      orderId: event.orderId,
      storeId: event.storeId,
      recipientType: 'store_owner',
      message: 'Yeni sipariş aldınız',
      total: event.total || null,
    };

    return this.transport.send(notification);
  }

  async handleOrderPaid(event) {
    if (!this._shouldDispatch('order.paid', event)) {
      return null;
    }

    const notification = {
      type: 'order-paid',
      orderId: event.orderId,
      userId: event.userId,
      recipientType: 'customer',
      message: 'Ödeme başarıyla alındı',
      total: event.total || null,
    };

    return this.transport.send(notification);
  }

  async handleOrderFailed(event) {
    if (!this._shouldDispatch('order.failed', event)) {
      return null;
    }

    const notification = {
      type: 'order-failed',
      orderId: event.orderId,
      userId: event.userId,
      recipientType: 'customer',
      reason: event.reason || 'Payment failed',
      message: 'Ödeme işlemi başarısız oldu',
    };

    return this.transport.send(notification);
  }

  async handleOrderShipped(event) {
    if (!this._shouldDispatch('order.shipped', event)) {
      return null;
    }

    const notification = {
      type: 'order-shipped',
      orderId: event.orderId,
      userId: event.userId,
      recipientType: 'customer',
      message: 'Siparişiniz kargoya verildi',
      trackingNumber: event.trackingNumber || null,
      carrier: event.carrier || null,
    };

    return this.transport.send(notification);
  }

  async handleOrderCompleted(event) {
    if (!this._shouldDispatch('order.completed', event)) {
      return null;
    }

    const notification = {
      type: 'order-completed',
      orderId: event.orderId,
      userId: event.userId,
      recipientType: 'customer',
      message: 'Siparişiniz teslim edildi',
      deliveredAt: event.deliveredAt || event.timestamp || null,
    };

    logger.info('Notification dispatched for order completion', {
      orderId: event.orderId,
      userId: event.userId || null,
    });

    return this.transport.send(notification);
  }
}

module.exports = new NotificationService();
