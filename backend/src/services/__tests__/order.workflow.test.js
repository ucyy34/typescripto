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

const orderService = require('../order.service');
const orderEvents = require('../../events/order.events');

describe('OrderService.createFromCart', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('splits checkout cart per store and publishes order.created for each order', async () => {
    const fakeOrders = [
      {
        id: 'order-1',
        user_id: 'user-1',
        store_id: 'store-1',
        total: '100.00',
        status: 'pending_payment',
      },
      {
        id: 'order-2',
        user_id: 'user-1',
        store_id: 'store-2',
        total: '200.00',
        status: 'pending_payment',
      },
    ];

    const createOrderSpy = jest
      .spyOn(orderService, 'createOrder')
      .mockResolvedValueOnce(fakeOrders[0])
      .mockResolvedValueOnce(fakeOrders[1]);

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
          item_total: 200,
        },
      ],
      totals: { subtotal: 300, item_count: 3 },
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
    expect(createOrderSpy).toHaveBeenNthCalledWith(
      1,
      'user-1',
      expect.objectContaining({
        store_id: 'store-1',
        items: [{ product_id: 'product-1', quantity: 2 }],
      })
    );
    expect(createOrderSpy).toHaveBeenNthCalledWith(
      2,
      'user-1',
      expect.objectContaining({
        store_id: 'store-2',
        items: [{ product_id: 'product-2', quantity: 1 }],
      })
    );

    expect(orderEvents.publishOrderCreated).toHaveBeenCalledTimes(2);
    expect(orderEvents.publishOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1' })
    );
    expect(orderEvents.publishOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-2' })
    );
    expect(orders).toEqual(fakeOrders);
  });
});
