jest.mock('../config/redis', () => {
  const createMulti = () => ({
    hset: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  });

  const client = {
    duplicate: jest.fn(() => client),
    on: jest.fn(),
    hget: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
    hset: jest.fn().mockResolvedValue(null),
    expire: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(null),
    watch: jest.fn().mockResolvedValue(null),
    unwatch: jest.fn().mockResolvedValue(null),
    multi: jest.fn(() => createMulti()),
  };

  return { redisClient: client };
});

jest.mock('../events/order.events', () => {
  const actual = jest.requireActual('../events/order.events');
  return {
    ...actual,
    publishOrderPaid: jest.fn().mockResolvedValue(null),
    publishOrderCompleted: jest.fn().mockResolvedValue(null),
  };
});

const orderService = require('../services/order.service');
const notificationService = require('../services/notification.service');
const analyticsService = require('../services/analytics.service');
const orderEvents = require('../events/order.events');

describe('Order event pipeline', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    analyticsService.reset();
    notificationService.sentEvents = new Map();
    notificationService.setTransport({
      async send() {
        return null;
      },
    });
  });

  it('marks orders as paid without emitting premature completion', async () => {
    const publishPaidSpy = jest.spyOn(orderEvents, 'publishOrderPaid').mockResolvedValue();
    const publishCompletedSpy = jest.spyOn(orderEvents, 'publishOrderCompleted').mockResolvedValue();

    const orderMock = {
      id: 'order-paid-1',
      user_id: 'user-1',
      store_id: 'store-1',
      total: '120.00',
      currency: 'TRY',
      status: 'pending_payment',
      payment_status: 'pending',
      paid_at: null,
      items: [],
      store: { id: 'store-1' },
    };
    orderMock.save = jest.fn().mockResolvedValue(orderMock);
    orderMock.reload = jest.fn().mockResolvedValue(orderMock);

    jest.spyOn(orderService, '_loadOrderWithRelations').mockResolvedValue(orderMock);

    const result = await orderService.markOrderPaid('order-paid-1', {
      transactionId: 'txn-123',
    });

    expect(result.status).toBe('paid');
    expect(publishPaidSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-paid-1', transactionId: 'txn-123' })
    );
    expect(publishCompletedSpy).not.toHaveBeenCalled();
  });

  it('emits completion event only via markOrderCompleted', async () => {
    const publishCompletedSpy = jest.spyOn(orderEvents, 'publishOrderCompleted').mockResolvedValue();

    const orderMock = {
      id: 'order-complete-1',
      user_id: 'user-1',
      store_id: 'store-1',
      total: '200.00',
      currency: 'TRY',
      status: 'shipped',
      payment_status: 'paid',
      items: [],
      store: { id: 'store-1' },
    };
    orderMock.save = jest.fn().mockResolvedValue(orderMock);
    orderMock.reload = jest.fn().mockResolvedValue(orderMock);

    jest.spyOn(orderService, '_loadOrderWithRelations').mockResolvedValue(orderMock);

    const order = await orderService.markOrderCompleted('order-complete-1');

    expect(order.status).toBe('delivered');
    expect(publishCompletedSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-complete-1', status: 'completed' })
    );
  });

  it('sends notifications once per event type', async () => {
    const transport = { send: jest.fn().mockResolvedValue(true) };
    notificationService.setTransport(transport);

    const payload = { orderId: 'order-55', userId: 'user-9', storeId: 'store-2' };

    await notificationService.handleOrderCreated(payload);
    await notificationService.handleOrderCreated(payload);
    await notificationService.handleOrderPaid({ ...payload, total: 199.9 });
    await notificationService.handleOrderPaid({ ...payload, total: 199.9 });
    await notificationService.handleOrderCompleted(payload);
    await notificationService.handleOrderCompleted(payload);

    expect(transport.send).toHaveBeenCalledTimes(3);
    expect(transport.send).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'order-created' }));
    expect(transport.send).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'order-paid' }));
    expect(transport.send).toHaveBeenNthCalledWith(3, expect.objectContaining({ type: 'order-completed' }));
  });

  it('aggregates analytics metrics per store without duplicates', async () => {
    await analyticsService.handleOrderEvent(orderEvents.ORDER_EVENTS.ORDER_CREATED, {
      orderId: 'order-analytics-1',
      storeId: 'store-1',
    });

    await analyticsService.handleOrderEvent(orderEvents.ORDER_EVENTS.ORDER_CREATED, {
      orderId: 'order-analytics-1',
      storeId: 'store-1',
    });

    await analyticsService.handleOrderEvent(orderEvents.ORDER_EVENTS.ORDER_PAID, {
      orderId: 'order-analytics-1',
      storeId: 'store-1',
      total: 250,
    });

    await analyticsService.handleOrderEvent(orderEvents.ORDER_EVENTS.ORDER_PAID, {
      orderId: 'order-analytics-1',
      storeId: 'store-1',
      total: 250,
    });

    await analyticsService.handleOrderEvent(orderEvents.ORDER_EVENTS.ORDER_COMPLETED, {
      orderId: 'order-analytics-1',
      storeId: 'store-1',
    });

    const metrics = analyticsService.getMetrics('store-1');
    expect(metrics).toEqual({ orders: 1, revenue: 250, completed: 1 });
  });
});
