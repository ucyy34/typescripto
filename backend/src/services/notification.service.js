const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.transport = {
      async send(notification) {
        logger.info('Notification dispatched', notification);
      },
    };
    this.sentNotifications = new Map();
    this.finalizedOrders = new Set();
  }

  setTransport(transport) {
    this.transport = transport;
  }

  _shouldSend(orderId, eventType) {
    if (!orderId) {
      return true;
    }

    if (this.finalizedOrders.has(orderId)) {
      return false;
    }

    const sentForOrder = this.sentNotifications.get(orderId) || new Set();
    if (sentForOrder.has(eventType)) {
      return false;
    }

    sentForOrder.add(eventType);
    this.sentNotifications.set(orderId, sentForOrder);
    return true;
  }

  _finalize(orderId) {
    if (!orderId) {
      return;
    }

    this.finalizedOrders.add(orderId);
    this.sentNotifications.delete(orderId);
  }

  async handleOrderCreated(event) {
    if (!event?.orderId || !this._shouldSend(event.orderId, 'order.created')) {
      return null;
    }

    return this.transport.send({
      type: 'order-created',
      orderId: event.orderId,
      storeId: event.storeId || null,
      message: 'Yeni sipariş aldınız',
      recipient: 'store',
    });
  }

  async handleOrderPaid(event) {
    if (!event?.orderId || !this._shouldSend(event.orderId, 'order.paid')) {
      return null;
    }

    return this.transport.send({
      type: 'order-paid',
      orderId: event.orderId,
      userId: event.userId,
      message: 'Ödeme başarıyla alındı',
      recipient: 'customer',
    });
  }

  async handleOrderFailed(event) {
    if (!event?.orderId || !this._shouldSend(event.orderId, 'order.failed')) {
      return null;
    }

    const result = await this.transport.send({
      type: 'order-failed',
      orderId: event.orderId,
      userId: event.userId,
      reason: event.reason || 'Payment failed',
      message: 'Ödeme işlemi başarısız oldu',
      recipient: 'customer',
    });

    this._finalize(event.orderId);

    return result;
  }

  async handleOrderShipped(event) {
    if (!event?.orderId || !this._shouldSend(event.orderId, 'order.shipped')) {
      return null;
    }

    return this.transport.send({
      type: 'order-shipped',
      orderId: event.orderId,
      userId: event.userId,
      trackingNumber: event.trackingNumber || null,
      carrier: event.carrier || null,
      message: 'Siparişiniz kargoya verildi',
      recipient: 'customer',
    });
  }

  async handleOrderCompleted(event) {
    if (!event?.orderId || !this._shouldSend(event.orderId, 'order.completed')) {
      return null;
    }

    logger.info('Notification dispatched for order completion', {
      orderId: event.orderId,
      userId: event.userId || null,
    });

    const result = await this.transport.send({
      type: 'order-completed',
      orderId: event.orderId,
      userId: event.userId,
      message: 'Siparişiniz teslim edildi',
      recipient: 'customer',
    });

    this._finalize(event.orderId);

    return result;
  }
}

module.exports = new NotificationService();
