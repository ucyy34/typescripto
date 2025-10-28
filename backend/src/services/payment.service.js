const logger = require('../utils/logger');
const { publishPaymentEvent, PAYMENT_EVENTS } = require('../events/payment.events');
const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const orderService = require('./order.service');

class PaymentService {
  constructor() {
    this.initialized = false;
  }

  initializeSubscribers() {
    if (this.initialized) {
      return;
    }

    eventBus.subscribe(ORDER_EVENTS.CREATED, async (payload) => {
      await this.handleOrderCreated(payload);
    });

    this.initialized = true;
  }

  async handleOrderCreated(payload) {
    logger.info('PaymentService: processing order.created', payload);
    await publishPaymentEvent(PAYMENT_EVENTS.REQUESTED, {
      orderId: payload.orderId,
      userId: payload.userId,
      timestamp: new Date().toISOString(),
    });
  }

  async capturePayment(orderId, payment = {}) {
    logger.info('PaymentService: capturing payment', { orderId, payment });
    await publishPaymentEvent(PAYMENT_EVENTS.SUCCEEDED, {
      orderId,
      userId: payment.userId || null,
      timestamp: new Date().toISOString(),
    });

    return orderService.markOrderPaid(orderId, payment);
  }

  async failPayment(orderId, failure = {}) {
    logger.warn('PaymentService: failing payment', { orderId, failure });
    await publishPaymentEvent(PAYMENT_EVENTS.FAILED, {
      orderId,
      userId: failure.userId || null,
      reason: failure.reason,
      timestamp: new Date().toISOString(),
    });

    return orderService.markOrderFailed(orderId, failure);
  }
}

module.exports = new PaymentService();
