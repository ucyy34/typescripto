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

  it('creates an order from cart data and publishes order.created', async () => {
    const fakeOrder = {
      id: 'order-1',
      user_id: 'user-1',
      store_id: 'store-1',
      total: '100.00',
      status: 'pending_payment',
    };

    const createOrderSpy = jest
      .spyOn(orderService, 'createOrder')
      .mockResolvedValue(fakeOrder);

    const cart = {
      items: [
        {
          product_id: 'product-1',
          quantity: 2,
          store: { id: 'store-1' },
        },
      ],
      totals: { subtotal: 100, item_count: 2 },
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

    const order = await orderService.createFromCart('user-1', cart, checkoutInput);

    expect(createOrderSpy).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        store_id: 'store-1',
        items: [{ product_id: 'product-1', quantity: 2 }],
      })
    );
    expect(orderEvents.publishOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1' })
    );
    expect(order).toEqual(fakeOrder);
  });
});
