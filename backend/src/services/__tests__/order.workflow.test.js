jest.mock('../../events/order.events', () => {
  const actual = jest.requireActual('../../events/order.events');
  return {
    ...actual,
    publishOrderCreated: jest.fn().mockResolvedValue(null),
    publishOrderPaid: jest.fn().mockResolvedValue(null),
    publishOrderCompleted: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('../../models', () => ({
  Order: {
    findByPk: jest.fn(),
  },
}));

const orderService = require('../order.service');
const orderEvents = require('../../events/order.events');
const { Order } = require('../../models');

describe('OrderService marketplace workflow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Order.findByPk.mockReset();
  });

  it('creates independent orders per store and publishes events', async () => {
    const createOrderSpy = jest.spyOn(orderService, 'createOrder').mockImplementation(async (_userId, payload) => ({
      id: `order-${payload.store_id}`,
      user_id: 'user-1',
      store_id: payload.store_id,
      subtotal: '150.00',
      total: '180.00',
      status: 'pending_payment',
    }));

    const cart = {
      items: [
        {
          product_id: 'product-1',
          quantity: 1,
          store: { id: 'store-1' },
          item_total: 90,
        },
        {
          product_id: 'product-2',
          quantity: 2,
          store: { id: 'store-2' },
          item_total: 60,
        },
      ],
      totals: { subtotal: 150, item_count: 3 },
    };

    const checkoutInput = {
      shipping_address: { city: 'Istanbul' },
      payment_method: 'card',
    };

    const orders = await orderService.createFromCart('user-1', cart, checkoutInput);

    expect(createOrderSpy).toHaveBeenCalledTimes(2);
    expect(orderEvents.publishOrderCreated).toHaveBeenCalledTimes(2);
    expect(orders).toHaveLength(2);
    const storeIds = orders.map((order) => order.store_id);
    expect(storeIds).toEqual(expect.arrayContaining(['store-1', 'store-2']));
  });

  it('publishes order.paid without auto completing the order', async () => {
    const orderRecord = {
      id: 'order-1',
      user_id: 'user-1',
      store_id: 'store-1',
      status: 'pending_payment',
      payment_status: 'pending',
      save: jest.fn().mockResolvedValue(true),
      reload: jest.fn().mockResolvedValue(true),
    };

    Order.findByPk.mockResolvedValue(orderRecord);

    await orderService.markOrderPaid('order-1', { transactionId: 'txn-123' });

    expect(orderRecord.status).toBe('paid');
    expect(orderRecord.payment_status).toBe('paid');
    expect(orderEvents.publishOrderPaid).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', transactionId: 'txn-123' })
    );
    expect(orderEvents.publishOrderCompleted).not.toHaveBeenCalled();
  });
});
