'use strict';

const saveMock = jest.fn();

jest.mock('../../events/order.events', () => ({
  publishOrderCreated: jest.fn(),
  publishOrderPaid: jest.fn(),
  publishOrderShipped: jest.fn(),
  publishOrderCompleted: jest.fn(),
  ORDER_EVENTS: {
    CREATED: 'order.created',
    PAID: 'order.paid',
    SHIPPED: 'order.shipped',
    COMPLETED: 'order.completed',
    FAILED: 'order.failed',
  },
}));

jest.mock('../../models', () => ({
  Order: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  OrderItem: {
    findAll: jest.fn(),
  },
  Product: {
    increment: jest.fn(),
  },
  Store: {},
  User: {},
}));

const { ORDER_EVENTS, publishOrderPaid } = require('../../events/order.events');
const { Order } = require('../../models');
const orderService = require('../order.service');
const PaymentService = require('../payment.service');
const NotificationService = require('../notification.service');
const AnalyticsService = require('../analytics.service');
const recommendationService = require('../recommendation.service');
const { cache } = require('../../config/redis');

class MockBus {
  constructor() {
    this.handlers = new Map();
  }

  subscribe(type, handler) {
    const existing = this.handlers.get(type) || [];
    existing.push(handler);
    this.handlers.set(type, existing);
    return { close: () => {} };
  }

  async publish(type, payload) {
    const handlers = this.handlers.get(type) || [];
    for (const handler of handlers) {
      await handler(payload);
    }
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  saveMock.mockReset();
});

describe('Order workflow events', () => {
  test('markOrderPaid publishes order.paid event', async () => {
    const orderRecord = {
      id: 'order-1',
      user_id: 'user-1',
      status: 'pending_payment',
      payment_status: 'pending',
      payment_details: null,
      save: saveMock.mockResolvedValue(),
    };

    Order.findByPk.mockResolvedValue(orderRecord);
    Order.findOne.mockResolvedValue({
      id: 'order-1',
      user_id: 'user-1',
      status: 'paid',
      payment_status: 'paid',
    });

    await orderService.markOrderPaid('order-1', { transactionId: 'txn-1', provider: 'stripe' });

    expect(Order.findByPk).toHaveBeenCalledWith('order-1');
    expect(saveMock).toHaveBeenCalled();
    expect(publishOrderPaid).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      expect.objectContaining({
        payment: expect.objectContaining({ transactionId: 'txn-1', provider: 'stripe' }),
      })
    );
  });

  test('PaymentService processes order.created event', async () => {
    const bus = new MockBus();
    const mockOrderService = {
      markOrderPaid: jest.fn().mockResolvedValue({ id: 'order-99' }),
    };
    const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    const paymentService = new PaymentService({ bus, orderSvc: mockOrderService, log: mockLogger });
    paymentService.register();

    await bus.publish(ORDER_EVENTS.CREATED, { orderId: 'order-99', total: 250, currency: 'TRY' });

    expect(mockOrderService.markOrderPaid).toHaveBeenCalledWith(
      'order-99',
      expect.objectContaining({ transactionId: expect.stringMatching(/^txn_/), provider: 'stripe-sim' })
    );
  });

  test('NotificationService stores notifications for payment outcomes', async () => {
    const bus = new MockBus();
    const notificationService = new NotificationService({ bus, log: { info: jest.fn(), warn: jest.fn() } });
    notificationService.register();

    await bus.publish(ORDER_EVENTS.PAID, { orderId: 'order-5', userId: 'user-5' });
    await bus.publish(ORDER_EVENTS.FAILED, { orderId: 'order-5', userId: 'user-5', reason: 'declined' });

    expect(notificationService.sent).toHaveLength(2);
    expect(notificationService.sent[0].message).toMatch(/Payment received/);
    expect(notificationService.sent[1].payload.reason).toBe('declined');
  });

  test('AnalyticsService tracks every event type', async () => {
    const bus = new MockBus();
    const analyticsService = new AnalyticsService({ bus, log: { info: jest.fn() } });
    analyticsService.register();

    await bus.publish(ORDER_EVENTS.CREATED, { orderId: 'order-7', userId: 'user-7' });
    await bus.publish(ORDER_EVENTS.PAID, { orderId: 'order-7', userId: 'user-7' });
    await bus.publish(ORDER_EVENTS.COMPLETED, { orderId: 'order-7', userId: 'user-7' });

    expect(analyticsService.events).toHaveLength(3);
    expect(analyticsService.events.map((e) => e.eventType)).toEqual([
      ORDER_EVENTS.CREATED,
      ORDER_EVENTS.PAID,
      ORDER_EVENTS.COMPLETED,
    ]);
  });

  test('RecommendationService clears cache on order completion', async () => {
    const spy = jest.spyOn(cache, 'delPattern').mockResolvedValue(1);

    await recommendationService.handleOrderCompletedEvent({ orderId: 'order-11', userId: 'user-11' });

    expect(spy).toHaveBeenCalledWith('recommendations:cart:user-11:*');
    spy.mockRestore();
  });
});
