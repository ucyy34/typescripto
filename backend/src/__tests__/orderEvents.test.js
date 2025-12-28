process.env.NODE_ENV = 'test';
process.env.EVENT_BUS_MODE = 'memory';

jest.mock('../config/redis', () => {
  const createMulti = () => ({
    hset: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  });

  const mockClient = {
    on: jest.fn(),
    duplicate: () => mockClient,
    multi: createMulti,
    watch: jest.fn().mockResolvedValue(),
    unwatch: jest.fn().mockResolvedValue(),
    hgetall: jest.fn().mockResolvedValue({}),
    hset: jest.fn().mockResolvedValue(),
    expire: jest.fn().mockResolvedValue(),
    del: jest.fn().mockResolvedValue(),
    scanStream: () => ({
      on: jest.fn(),
    }),
  };

  return {
    redisClient: mockClient,
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      exists: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
    },
  };
  return {
    redisClient: mockClient,
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      exists: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
    },
  };
});

const { Order } = require('../models');

const { ORDER_EVENTS } = require('../events/order.events');
const eventBus = require('../events/eventBus');
const paymentService = require('../services/payment.service');
const orderService = require('../services/order.service');
const commissionService = require('../services/commission.service');
const notificationService = require('../services/notification.service').default || require('../services/notification.service');
const analyticsService = require('../services/analytics.service').default || require('../services/analytics.service');

require('../workers/commission.worker');
require('../workers/notification.worker');
require('../workers/analytics.worker');
require('../workers/payment.worker');

describe('Event-driven order pipeline', () => {
  afterEach(() => {
    jest.clearAllMocks();
    analyticsService.reset();
    notificationService.sentNotifications.clear();
    notificationService.finalizedOrders.clear();
    notificationService.setTransport({
      async send(notification) {
        return notification;
      },
    });
  });

  it('marks order as paid when payment succeeds', async () => {
    const markOrderPaidSpy = jest.spyOn(Order, 'update').mockResolvedValue([1]);

    // Silence logger warning
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

    await paymentService.handleOrderCreated({ orderId: 'order-321', userId: 'user-9', amount: 199.99 });

    expect(markOrderPaidSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paid', payment_status: 'paid' }),
      expect.objectContaining({ where: { id: 'order-321' } })
    );

    warnSpy.mockRestore();
  });

  it('triggers commission calculation after order.paid event', async () => {
    const commissionSpy = jest
      .spyOn(commissionService, 'createCommissionTransaction')
      .mockResolvedValue({ id: 'commission-1' });

    await eventBus.publish(ORDER_EVENTS.ORDER_PAID, {
      orderId: 'order-555',
      storeId: 'store-77',
      total: 250,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(commissionSpy).toHaveBeenCalledWith('order-555');
  });

  it('sends notifications once per event type', async () => {
    const sendMock = jest.fn(async (payload) => payload);
    notificationService.setTransport({ send: sendMock });
    notificationService.sentNotifications.clear();

    await notificationService.handleOrderPaid({ orderId: 'order-200', userId: 'user-200' });
    await notificationService.handleOrderPaid({ orderId: 'order-200', userId: 'user-200' });
    await notificationService.handleOrderCompleted({ orderId: 'order-200', userId: 'user-200' });
    await notificationService.handleOrderCompleted({ orderId: 'order-200', userId: 'user-200' });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ type: 'order-paid' });
    expect(sendMock.mock.calls[1][0]).toMatchObject({ type: 'order-completed' });
  });

  it('aggregates analytics metrics per store without duplicates', async () => {
    analyticsService.reset();

    await analyticsService.handleOrderEvent(ORDER_EVENTS.ORDER_CREATED, {
      orderId: 'order-700',
      storeId: 'store-900',
    });
    await analyticsService.handleOrderEvent(ORDER_EVENTS.ORDER_PAID, {
      orderId: 'order-700',
      storeId: 'store-900',
      total: 175.45,
    });
    await analyticsService.handleOrderEvent(ORDER_EVENTS.ORDER_COMPLETED, {
      orderId: 'order-700',
      storeId: 'store-900',
    });
    await analyticsService.handleOrderEvent(ORDER_EVENTS.ORDER_COMPLETED, {
      orderId: 'order-700',
      storeId: 'store-900',
    });

    const metrics = analyticsService.getMetrics('store-900');

    expect(metrics['store-900']).toMatchObject({
      ordersCreated: 1,
      completedOrders: 1,
      revenue: 175.45,
    });
  });
});
