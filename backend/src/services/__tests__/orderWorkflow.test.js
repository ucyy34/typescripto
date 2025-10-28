jest.mock('../../config/redis', () => ({
  redisClient: {
    duplicate: jest.fn(() => ({
      on: jest.fn(),
      quit: jest.fn(),
    })),
  },
  cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('../../events/order.events', () => ({
  ORDER_EVENTS: {
    CREATED: 'order.created',
    PAID: 'order.paid',
    SHIPPED: 'order.shipped',
    COMPLETED: 'order.completed',
    FAILED: 'order.failed',
  },
  publishOrderEvent: jest.fn(),
}));

jest.mock('../../events/payment.events', () => ({
  PAYMENT_EVENTS: {
    REQUESTED: 'payment.requested',
    SUCCEEDED: 'payment.succeeded',
    FAILED: 'payment.failed',
  },
  publishPaymentEvent: jest.fn(),
}));

const mockOrderInstance = () => ({
  id: 'order-1',
  user_id: 'user-1',
  status: 'pending_payment',
  payment_status: 'pending',
  payment_details: null,
  payment_transaction_id: null,
  total: '150.00',
  items: [
    {
      product_id: 'product-1',
      quantity: 2,
      total: 150,
    },
  ],
  save: jest.fn().mockResolvedValue(true),
});

jest.mock('../../models', () => {
  const instance = mockOrderInstance();
  return {
    Order: {
      findByPk: jest.fn().mockResolvedValue(instance),
    },
    OrderItem: {},
    Product: {},
    Store: {},
    User: {},
  };
});

const { publishOrderEvent, ORDER_EVENTS } = require('../../events/order.events');
const { publishPaymentEvent, PAYMENT_EVENTS } = require('../../events/payment.events');
const orderService = require('../order.service');
const paymentService = require('../payment.service');
const notificationService = require('../notification.service');

describe('Order workflow event pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits order.created when a cart checkout occurs', async () => {
    const mockOrder = {
      ...mockOrderInstance(),
      id: 'order-checkout',
      user_id: 'buyer-1',
    };

    jest.spyOn(orderService, 'createOrder').mockResolvedValue(mockOrder);

    await orderService.createFromCart({
      userId: 'buyer-1',
      cartItems: [
        { product_id: 'product-1', quantity: 1, store_id: 'store-1' },
        { product_id: 'product-2', quantity: 2, store_id: 'store-1' },
      ],
      checkout: {
        store_id: 'store-1',
        shipping_address: { full_name: 'Test', phone: '111', address_line1: 'Street', city: 'City', postal_code: '1111', country: 'TR' },
      },
    });

    expect(orderService.createOrder).toHaveBeenCalledWith(
      'buyer-1',
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ product_id: 'product-1', quantity: 1 }),
        ]),
      })
    );

    expect(publishOrderEvent).toHaveBeenCalledWith(
      ORDER_EVENTS.CREATED,
      expect.objectContaining({ orderId: 'order-checkout', userId: 'buyer-1' })
    );
  });

  it('marks an order as paid and emits order.paid', async () => {
    const orderRecord = mockOrderInstance();
    const models = require('../../models');
    models.Order.findByPk.mockResolvedValue(orderRecord);
    jest.spyOn(orderService, 'getOrderById').mockResolvedValue({ ...orderRecord });

    const result = await orderService.markOrderPaid('order-1', {
      transactionId: 'txn-123',
      details: { provider: 'stripe' },
    });

    expect(orderRecord.save).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(publishOrderEvent).toHaveBeenCalledWith(
      ORDER_EVENTS.PAID,
      expect.objectContaining({ orderId: 'order-1' })
    );
  });

  it('captures payment via payment service and forwards to order service', async () => {
    const markOrderPaid = jest.spyOn(orderService, 'markOrderPaid').mockResolvedValue({
      id: 'order-2',
    });

    await paymentService.capturePayment('order-2', { transactionId: 'txn-2' });

    expect(publishPaymentEvent).toHaveBeenCalledWith(
      PAYMENT_EVENTS.SUCCEEDED,
      expect.objectContaining({ orderId: 'order-2' })
    );
    expect(markOrderPaid).toHaveBeenCalledWith('order-2', expect.objectContaining({ transactionId: 'txn-2' }));
  });

  it('sends notification on payment failure', async () => {
    const response = await notificationService.notifyPaymentFailure({
      orderId: 'order-3',
      reason: 'card_declined',
    });

    expect(response).toMatchObject({ type: 'payment_failure', notified: true });
  });
});
