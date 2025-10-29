const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.transport = {
      async send(notification) {
        logger.info('Notification dispatched', notification);
      },
    };
    this.sentEvents = new Map();
  }

  setTransport(transport) {
    this.transport = transport;
  }

  _shouldDispatch(orderId, eventKey) {
    if (!orderId) {
      return true;
    }

    const existing = this.sentEvents.get(orderId) || new Set();
    if (existing.has(eventKey)) {
      return false;
    }

    existing.add(eventKey);
    this.sentEvents.set(orderId, existing);
    return true;
  }

  async _dispatch(orderId, eventKey, notification, { terminal = false } = {}) {
    if (!this._shouldDispatch(orderId, eventKey)) {
      return null;
    }

    const result = await this.transport.send(notification);

    return result;
  }

  async handleOrderCreated(event) {
    if (!event || !event.orderId) {
      return null;
    }

    return this._dispatch(
      event.orderId,
      'order.created',
      {
        type: 'order-created',
        orderId: event.orderId,
        storeId: event.storeId,
        message: 'Yeni bir sipariş aldınız',
      }
    );
  }

  async handleOrderPaid(event) {
    if (!event) {
      return null;
    }

    return this._dispatch(
      event.orderId,
      'order.paid',
      {
        type: 'order-paid',
        orderId: event.orderId,
        userId: event.userId,
        storeId: event.storeId,
        message: 'Ödemeniz başarıyla alındı',
      }
    );
  }

  async handleOrderFailed(event) {
    if (!event) {
      return null;
    }

    return this._dispatch(
      event.orderId,
      'order.failed',
      {
        type: 'order-failed',
        orderId: event.orderId,
        userId: event.userId,
        reason: event.reason || 'Payment failed',
        message: 'Ödemeniz tamamlanamadı',
      },
      { terminal: true }
    );
  }

  async handleOrderCompleted(event) {
    if (!event) {
      return null;
    }

    logger.info('Notification dispatched for order completion', {
      orderId: event.orderId,
      userId: event.userId || null,
    });

    return this._dispatch(
      event.orderId,
      'order.completed',
      {
        type: 'order-completed',
        orderId: event.orderId,
        userId: event.userId,
        storeId: event.storeId,
        message: 'Siparişiniz teslim edildi',
      },
      { terminal: true }
    );
  }

  async handleOrderShipped(event) {
    if (!event || !event.orderId) {
      return null;
    }

    return this._dispatch(event.orderId, 'order.shipped', {
      type: 'order-shipped',
      orderId: event.orderId,
      userId: event.userId,
      storeId: event.storeId,
      message: 'Siparişiniz kargoya verildi',
      trackingNumber: event.trackingNumber || null,
      carrier: event.carrier || null,
    });
  }
}

module.exports = new NotificationService();
