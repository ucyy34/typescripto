'use strict';

const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const logger = require('../utils/logger');

class NotificationService {
  constructor({ bus = eventBus, log = logger } = {}) {
    this.bus = bus;
    this.logger = log;
    this.sent = [];
  }

  register() {
    this.bus.subscribe(ORDER_EVENTS.PAID, (payload) => this.handlePaymentSuccess(payload), {
      workerId: 'notification-paid',
      concurrency: 3,
    });

    this.bus.subscribe(ORDER_EVENTS.FAILED, (payload) => this.handlePaymentFailure(payload), {
      workerId: 'notification-failed',
      concurrency: 3,
    });

    this.bus.subscribe(ORDER_EVENTS.SHIPPED, (payload) => this.handleShipped(payload), {
      workerId: 'notification-shipped',
      concurrency: 2,
    });
  }

  async handlePaymentSuccess(payload) {
    const message = `Payment received for order ${payload.orderId}`;
    await this.logNotification(payload.userId, message, payload);
  }

  async handlePaymentFailure(payload) {
    const message = `Payment failed for order ${payload.orderId}`;
    await this.logNotification(payload.userId, message, payload);
  }

  async handleShipped(payload) {
    const message = `Order ${payload.orderId} shipped`;
    await this.logNotification(payload.userId, message, payload);
  }

  async logNotification(userId, message, payload) {
    this.logger.info('[NotificationService] %s', message, {
      userId,
      payload,
    });
    this.sent.push({ userId, message, payload });
  }
}

module.exports = NotificationService;
