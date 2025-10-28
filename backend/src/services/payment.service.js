'use strict';

const { ORDER_EVENTS, publishOrderFailed } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const logger = require('../utils/logger');
const orderService = require('./order.service');

class PaymentService {
  constructor({ bus = eventBus, orderSvc = orderService, log = logger } = {}) {
    this.bus = bus;
    this.orderService = orderSvc;
    this.logger = log;
  }

  register() {
    this.bus.subscribe(ORDER_EVENTS.CREATED, (payload) => this.handleOrderCreated(payload), {
      workerId: 'payment-service',
      concurrency: 2,
    });

    this.bus.subscribe(ORDER_EVENTS.FAILED, (payload) => this.handleOrderFailed(payload), {
      workerId: 'payment-service-failed',
      concurrency: 1,
    });
  }

  async handleOrderCreated(payload) {
    if (payload.skipPayment === true) {
      this.logger.info('[PaymentService] Skipping auto payment for order %s', payload.orderId);
      return;
    }

    try {
      const paymentDetails = await this.charge(payload);
      await this.orderService.markOrderPaid(payload.orderId, {
        transactionId: paymentDetails.transactionId,
        provider: paymentDetails.provider,
        metadata: paymentDetails.metadata,
      });
    } catch (error) {
      this.logger.error('[PaymentService] Payment failed for order %s: %s', payload.orderId, error.message);
      await publishOrderFailed(
        { id: payload.orderId, user_id: payload.userId, status: 'failed' },
        {
          reason: error.message,
          stage: 'payment',
          userId: payload.userId,
        }
      );
    }
  }

  async handleOrderFailed(payload) {
    this.logger.warn('[PaymentService] Received order.failed event for order %s', payload.orderId, {
      reason: payload.reason,
    });
  }

  async charge(payload) {
    const transactionId = `txn_${Date.now()}`;
    this.logger.info('[PaymentService] Charging order %s via simulated gateway', payload.orderId);

    return {
      transactionId,
      provider: payload.provider || 'stripe-sim',
      metadata: {
        simulated: true,
        total: payload.total,
        currency: payload.currency,
        userId: payload.userId,
      },
    };
  }
}

module.exports = PaymentService;
