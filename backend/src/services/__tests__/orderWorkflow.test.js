'use strict';

const saveMock = jest.fn();
const reloadMock = jest.fn();

jest.mock('../../events/order.events', () => {
  const actual = jest.requireActual('../../events/order.events');
  return {
    ...actual,
    serializeOrderForEvent: jest.fn((order, overrides = {}) => ({
      orderId: order.id,
      userId: order.user_id || null,
      storeId: order.store_id || null,
      total: parseFloat(order.total || 0),
      ...overrides,
    })),
    publishOrderCreated: jest.fn(),
    publishOrderPaid: jest.fn(),
    publishOrderShipped: jest.fn(),
    publishOrderCompleted: jest.fn(),
    publishOrderFailed: jest.fn(),
  };
});

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

jest.mock('../commission.service', () => ({
  createCommissionTransaction: jest.fn(),
}));

const { publishOrderPaid, publishOrderCompleted } = require('../../events/order.events');
const { Order } = require('../../models');
const orderService = require('../order.service');
const notificationService = require('../notification.service');
const analyticsService = require('../analytics.service');
const commissionService = require('../commission.service');
const eventBus = require('../../events/eventBus');

require('../../workers/commission.worker');

describe('Order workflow orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveMock.mockReset();
    reloadMock.mockReset();
    notificationService.setTransport({
      async send() {
        return null;
      },
    });
    notificationService.sentNotifications.clear();
    analyticsService.reset();
  });

  test('markOrderPaid emits order.paid once without auto-completing', async () => {
    saveMock.mockResolvedValue();
    reloadMock.mockResolvedValue();
    const orderRecord = {
      id: 'order-1',
      user_id: 'user-1',
      store_id: 'store-1',
      status: 'pending_payment',
      payment_status: 'pending',
      payment_details: null,
      save: saveMock,
      reload: reloadMock,
    };

    reloadMock.mockResolvedValue(orderRecord);

    Order.findByPk.mockResolvedValue(orderRecord);

    await orderService.markOrderPaid('order-1', { transactionId: 'txn-1' });

    expect(Order.findByPk).toHaveBeenCalledWith('order-1', expect.any(Object));
    expect(saveMock).toHaveBeenCalled();
    expect(reloadMock).toHaveBeenCalled();
    expect(publishOrderPaid).toHaveBeenCalledTimes(1);
    expect(publishOrderPaid).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', transactionId: 'txn-1' })
    );
    expect(publishOrderCompleted).not.toHaveBeenCalled();
  });

  test('markOrderCompleted publishes completion event once delivery is confirmed', async () => {
    saveMock.mockResolvedValue();
    reloadMock.mockResolvedValue();
    const orderRecord = {
      id: 'order-77',
      user_id: 'user-9',
      store_id: 'store-4',
      status: 'shipped',
      payment_status: 'paid',
      save: saveMock,
      reload: reloadMock,
    };

    reloadMock.mockResolvedValue(orderRecord);

    Order.findByPk.mockResolvedValue(orderRecord);

    await orderService.markOrderCompleted('order-77', { feedback: 'Teslim edildi' });

    expect(Order.findByPk).toHaveBeenCalledWith('order-77', expect.any(Object));
    expect(publishOrderCompleted).toHaveBeenCalledTimes(1);
    expect(publishOrderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-77' })
    );
  });

  test('notification service deduplicates identical events per order', async () => {
    const sentNotifications = [];
    notificationService.setTransport({
      async send(notification) {
        sentNotifications.push(notification);
      },
    });

    await notificationService.handleOrderPaid({ orderId: 'order-5', userId: 'user-5' });
    await notificationService.handleOrderPaid({ orderId: 'order-5', userId: 'user-5' });
    await notificationService.handleOrderCompleted({ orderId: 'order-5', userId: 'user-5' });

    expect(sentNotifications).toHaveLength(2);
    expect(sentNotifications[0].type).toBe('order-paid');
    expect(sentNotifications[1].type).toBe('order-completed');
  });

  test('analytics aggregates store metrics without duplicate counts', async () => {
    await analyticsService.handleOrderEvent('order.created', {
      orderId: 'order-8',
      storeId: 'store-99',
    });
    await analyticsService.handleOrderEvent('order.paid', {
      orderId: 'order-8',
      storeId: 'store-99',
      total: 150.5,
    });
    await analyticsService.handleOrderEvent('order.paid', {
      orderId: 'order-8',
      storeId: 'store-99',
      total: 150.5,
    });
    await analyticsService.handleOrderEvent('order.completed', {
      orderId: 'order-8',
      storeId: 'store-99',
    });

    const metrics = analyticsService.getStoreMetrics('store-99');

    expect(metrics).toMatchObject({
      created: 1,
      paid: 1,
      completed: 1,
      revenue: 150.5,
    });
    expect(metrics.successRate).toBeCloseTo(1);
  });

  test('commission worker reacts to order.paid events', async () => {
    await eventBus.publish('order.paid', {
      orderId: 'commission-order-1',
      storeId: 'store-42',
      total: 250,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(commissionService.createCommissionTransaction).toHaveBeenCalledWith(
      'commission-order-1'
    );
  });
});
