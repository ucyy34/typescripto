const logger = require('../utils/logger');
const orderService = require('./order.service');

class PaymentService {
  constructor() {
    this.gateway = {
      async charge(_payload) {
        return {
          status: 'succeeded',
          transactionId: `txn_${Date.now()}`,
        };
      },
    };
  }

  setGateway(gateway) {
    this.gateway = gateway;
  }

  async handleOrderCreated(event) {
    if (!event || !event.orderId) {
      return null;
    }

    try {
      const chargeResult = await this.gateway.charge(event);

      if (chargeResult.status !== 'succeeded') {
        return this.markPaymentFailed(event.orderId, chargeResult.reason || 'Payment failed');
      }

      return this.markPaymentSuccessful(event.orderId, {
        transactionId: chargeResult.transactionId,
        paymentDetails: chargeResult,
      });
    } catch (error) {
      logger.error('Payment processing failed for order %s: %s', event.orderId, error.message);
      return this.markPaymentFailed(event.orderId, error.message);
    }
  }

  async markPaymentSuccessful(orderId, paymentPayload = {}) {
    return orderService.markOrderPaid(orderId, paymentPayload);
  }

  async markPaymentFailed(orderId, reason) {
    logger.warn('Marking order %s as failed: %s', orderId, reason);
    return orderService.markOrderFailed(orderId, { reason });
  }
}

module.exports = new PaymentService();
