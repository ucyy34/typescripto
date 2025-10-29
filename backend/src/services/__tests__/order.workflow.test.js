jest.mock('../../events/order.events', () => {
  const actual = jest.requireActual('../../events/order.events');
  return {
    ...actual,
    serializeOrderForEvent: jest.fn((order, overrides = {}) => ({
      orderId: order.id,
      userId: order.user_id || null,
      storeId: order.store_id || null,
      status: order.status,
      total: order.total,
      ...overrides,
    })),
    publishOrderCreated: jest.fn().mockResolvedValue(null),
    publishOrderPaid: jest.fn().mockResolvedValue(null),
    publishOrderShipped: jest.fn().mockResolvedValue(null),
    publishOrderCompleted: jest.fn().mockResolvedValue(null),
    publishOrderFailed: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('../../config/redis', () => {
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

const orderService = require('../order.service');
const orderEvents = require('../../events/order.events');

describe('OrderService multi-store checkout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('splits cart items per store and forwards metadata to createOrder', async () => {
    const createOrderSpy = jest.spyOn(orderService, 'createOrder').mockImplementation(
      async (_userId, payload) => ({
        id: `order-${payload.store_id}`,
        order_number: `ORD-${payload.store_id}`,
        user_id: 'user-1',
        store_id: payload.store_id,
        total: '150.00',
        currency: 'TRY',
        status: 'pending_payment',
        payment_status: 'pending',
        items: payload.items,
        store: { id: payload.store_id },
      })
    );

    const cart = {
      id: 'cart-123',
      items: [
        { product_id: 'p-1', quantity: 1, store: { id: 'store-1' } },
        { product_id: 'p-2', quantity: 2, store: { id: 'store-2' } },
      ],
      totals: { subtotal: 300, item_count: 3 },
    };

    const checkoutInput = {
      shipping_address: { city: 'Istanbul' },
      payment_method: 'card',
      customer_note: 'fast please',
    };

    const result = await orderService.createFromCart('user-1', cart, checkoutInput);

    expect(createOrderSpy).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = createOrderSpy.mock.calls;
    expect(firstCall[2]).toEqual(
      expect.objectContaining({
        origin: 'cart.checkout',
        cartId: 'cart-123',
        storeCount: 2,
      })
    );
    expect(secondCall[2]).toEqual(expect.objectContaining({ storeSequence: 2 }));

    expect(result.orders).toHaveLength(2);
    expect(result.totals).toEqual(
      expect.objectContaining({ grand_total: 300, per_store: { 'store-1': 150, 'store-2': 150 } })
    );
  });

  it('relays order.created events through createOrder', async () => {
    jest.spyOn(orderService, '_loadOrderWithRelations').mockResolvedValue({
      id: 'order-1',
      order_number: 'ORD-001',
      user_id: 'user-1',
      store_id: 'store-1',
      total: '120.00',
      currency: 'TRY',
      status: 'pending_payment',
      payment_status: 'pending',
    });

    const transaction = {
      async commit() {},
      async rollback() {},
    };

    jest.spyOn(orderService, 'generateOrderNumber').mockResolvedValue('ORD-001');
    jest.spyOn(orderService, 'validateOrderItems').mockResolvedValue({
      validatedItems: [
        {
          product: {
            id: 'p-1',
            price: 120,
            slug: 'p-1',
            title: 'Item',
            images: [],
            sku: 'SKU-1',
            decrement: jest.fn().mockResolvedValue(),
          },
          quantity: 1,
          total: 120,
        },
      ],
      subtotal: 120,
    });

    const { sequelize } = require('../../config/sequelize');
    jest.spyOn(sequelize, 'transaction').mockResolvedValue(transaction);

    const Order = require('../../models').Order;
    jest.spyOn(Order, 'create').mockResolvedValue({ id: 'order-1', order_number: 'ORD-001' });

    const OrderItem = require('../../models').OrderItem;
    jest.spyOn(OrderItem, 'create').mockResolvedValue(true);

    const Product = require('../../models').Product;
    jest.spyOn(Product, 'decrement').mockResolvedValue(true);

    const Store = require('../../models').Store;
    jest.spyOn(Store, 'findByPk').mockResolvedValue({ id: 'store-1', status: 'approved', settings: {} });

    const order = await orderService.createOrder('user-1', {
      store_id: 'store-1',
      items: [{ product_id: 'p-1', quantity: 1 }],
      shipping_address: { city: 'Istanbul' },
      payment_method: 'card',
    });

    expect(orderEvents.publishOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', paymentMethod: 'card' })
    );
    expect(order.id).toBe('order-1');
  });
});
