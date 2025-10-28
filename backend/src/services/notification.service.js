const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.transport = {
      async send(notification) {
        logger.info('Notification dispatched', notification);
      },
    };
  }

  setTransport(transport) {
    this.transport = transport;
  }

  async handleOrderPaid(event) {
    if (!event) {
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
    if (!event) {
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
    if (!event) {
      return null;
    }

    logger.info('Notification dispatched for order completion', {
      orderId: event.orderId || null,
      userId: event.userId || null,
    });

    return this.transport.send({
      type: 'order-completed',
      orderId: event.orderId,
      userId: event.userId,
      message: 'Order lifecycle completed successfully',
    });
  }
}

module.exports = new NotificationService();
