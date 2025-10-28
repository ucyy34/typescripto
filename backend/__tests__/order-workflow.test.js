describe('Event-driven order workflow', () => {
  let orderService;
  let orderEvents;
  let notificationService;

  beforeEach(() => {
    process.env.EVENT_BUS_MODE = 'memory';
    jest.resetModules();

    orderEvents = require('../src/events/order.events');
    orderService = require('../src/services/order.service');
    notificationService = require('../src/services/notification.service');
    require('../src/workers');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    notificationService.setTransport({
      async send() {
        return null;
      },
    });
  });

  it('processes checkout -> payment -> notification pipeline', async () => {
    const fakeOrder = {
      id: 'order-123',
      user_id: 'user-1',
      store_id: 'store-1',
      total: '150.00',
      status: 'pending_payment',
      payment_status: 'pending',
    };

    jest.spyOn(orderService, 'createOrder').mockResolvedValue(fakeOrder);

    jest.spyOn(orderService, 'markOrderPaid').mockImplementation(async (orderId, payload = {}) => {
      const paidOrder = { ...fakeOrder, id: orderId, status: 'paid', payment_status: 'paid' };
      await orderEvents.publishOrderPaid(orderEvents.serializeOrderForEvent(paidOrder, payload));
      return paidOrder;
    });

    const transport = { send: jest.fn().mockResolvedValue(true) };
    notificationService.setTransport(transport);

    const cart = {
      items: [
        {
          product_id: 'product-1',
          quantity: 1,
          store: { id: 'store-1' },
        },
      ],
      totals: { subtotal: 150 },
    };

    const checkoutInput = {
      shipping_address: {
        full_name: 'Integration User',
        address_line1: 'Integration Street',
        city: 'Istanbul',
        country: 'TR',
        postal_code: '34000',
        phone: '+901234567890',
      },
      payment_method: 'card',
    };

    await orderService.createFromCart('user-1', cart, checkoutInput);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(orderService.createOrder).toHaveBeenCalled();
    expect(orderService.markOrderPaid).toHaveBeenCalledWith(
      'order-123',
      expect.objectContaining({})
    );
    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'order-paid', orderId: 'order-123' })
    );
  });
});
