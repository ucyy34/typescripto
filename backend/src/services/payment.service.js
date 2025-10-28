const logger = require('../utils/logger');
const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const orderService = require('./order.service');

class PaymentService {
  constructor() {
    this.initialized = false;
    this.registerConsumers();
  }

  registerConsumers() {
    if (this.initialized || process.env.EVENT_CONSUMERS_DISABLED === 'true') {
      return;
    }

    eventBus.subscribe(ORDER_EVENTS.CREATED, async (payload) => {
      await this.handleOrderCreated(payload);
    });

    this.initialized = true;
  }

  async handleOrderCreated(payload) {
    const { orderId, userId } = payload;
    logger.info('Processing payment for order %s', orderId);

    try {
      const paymentResult = await this.processPayment(payload);
      const order = await orderService.markOrderPaid(orderId, {
        transactionId: paymentResult.transactionId,
        paymentDetails: paymentResult.metadata,
      });

      logger.info('Payment processed for order %s', orderId);
      return order;
    } catch (error) {
      logger.error('Payment failed for order %s: %s', orderId, error.message);
      await orderService.markOrderFailed(orderId, error.message);
      throw error;
    }
  }

  async processPayment(payload) {
    if (payload.shouldFail) {
      throw new Error('Payment rejected by provider');
    }

    return {
      transactionId: `pay_${Date.now()}`,
      metadata: {
        provider: payload.provider || 'mock-gateway',
        amount: payload.amount,
        currency: payload.currency || 'TRY',
      },
    };
  }
}

const paymentService = new PaymentService();

module.exports = paymentService;
module.exports.PaymentService = PaymentService;
