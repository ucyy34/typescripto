jest.mock('../../events/order.events', () => {
  const actual = jest.requireActual('../../events/order.events');
  return {
    ...actual,
    serializeOrderForEvent: jest.fn((order, overrides = {}) => ({
      orderId: order.id,
      userId: order.user_id || null,
      storeId: order.store_id || null,
      status: order.status,
      ...overrides,
    })),
    publishOrderCreated: jest.fn(actual.publishOrderCreated),
    publishOrderPaid: jest.fn(actual.publishOrderPaid),
    publishOrderShipped: jest.fn(actual.publishOrderShipped),
    publishOrderCompleted: jest.fn(actual.publishOrderCompleted),
    publishOrderFailed: jest.fn(actual.publishOrderFailed),
  };
});

jest.mock('../../config/redis', () => {
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
});

const orderService = require('../order.service');
const orderEvents = require('../../events/order.events');

describe('OrderService workflow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('splits cart by store and publishes order.created per store', async () => {
    const firstOrder = {
      id: 'order-1',
      user_id: 'user-1',
      store_id: 'store-1',
      total: '100.00',
      status: 'pending_payment',
    };

    const secondOrder = {
      id: 'order-2',
      user_id: 'user-1',
      store_id: 'store-2',
      total: '150.00',
      status: 'pending_payment',
    };

    const createOrderSpy = jest
      .spyOn(orderService, 'createOrder')
      .mockResolvedValueOnce(firstOrder)
      .mockResolvedValueOnce(secondOrder);

    const cart = {
      items: [
        {
          product_id: 'product-1',
          quantity: 2,
          store: { id: 'store-1' },
          item_total: 100,
        },
        {
          product_id: 'product-2',
          quantity: 1,
          store: { id: 'store-2' },
          item_total: 150,
        },
      ],
      totals: { subtotal: 250, item_count: 3 },
    };

    const checkoutInput = {
      shipping_address: {
        full_name: 'Test User',
        address_line1: 'Street 1',
        city: 'Istanbul',
        country: 'TR',
        postal_code: '34000',
        phone: '+9000000000',
      },
      payment_method: 'card',
    };

    const orders = await orderService.createFromCart('user-1', cart, checkoutInput);

    expect(createOrderSpy).toHaveBeenCalledTimes(2);
    expect(orders).toEqual([firstOrder, secondOrder]);
    expect(orderEvents.publishOrderCreated).toHaveBeenCalledTimes(2);
    expect(orderEvents.publishOrderCreated.mock.calls[0][0]).toMatchObject({
      orderId: 'order-1',
      storeId: 'store-1',
    });
    expect(orderEvents.publishOrderCreated.mock.calls[1][0]).toMatchObject({
      orderId: 'order-2',
      storeId: 'store-2',
    });
  });

  it('marks an order as paid without completing it prematurely', async () => {
    const order = {
      id: 'order-99',
      status: 'pending_payment',
      payment_status: 'pending',
      save: jest.fn().mockResolvedValue(true),
      reload: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(orderService, '_loadOrderWithRelations').mockResolvedValue(order);

    await orderService.markOrderPaid('order-99', { transactionId: 'txn-1' });

    expect(order.status).toBe('paid');
    expect(order.payment_status).toBe('paid');
    expect(orderEvents.publishOrderPaid).toHaveBeenCalledTimes(1);
    expect(orderEvents.publishOrderCompleted).not.toHaveBeenCalled();
  });

  it('emits order.completed only when markOrderCompleted is called', async () => {
    const order = {
      id: 'order-77',
      status: 'shipped',
      payment_status: 'paid',
      save: jest.fn().mockResolvedValue(true),
      reload: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(orderService, '_loadOrderWithRelations').mockResolvedValue(order);

    await orderService.markOrderCompleted('order-77', {});

    expect(order.status).toBe('delivered');
    expect(orderEvents.publishOrderCompleted).toHaveBeenCalledTimes(1);
  });
});
