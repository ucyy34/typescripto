describe('Event-driven order pipeline', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits checkout event when creating order from cart', async () => {
    const orderEvents = require('../events/order.events');
    const publishSpy = jest.spyOn(orderEvents, 'publishOrderCreated').mockResolvedValue(null);

    const orderService = require('../services/order.service');
    const fakeOrder = { id: 'order-123', status: 'pending_payment', store_id: 'store-1', total: 150 };
    jest.spyOn(orderService, 'createOrder').mockResolvedValue(fakeOrder);

    await orderService.createFromCart(
      'user-1',
      {
        items: [
          { product_id: 'product-1', quantity: 2, store: { id: 'store-1' }, item_total: 150 },
        ],
        totals: { subtotal: 150, item_count: 2 },
      },
      {
        shipping_address: { full_name: 'Test User' },
        payment_method: 'card',
      }
    );

    expect(orderService.createOrder).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ store_id: 'store-1' })
    );
    expect(publishSpy).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-123' }));
  });

  it('marks order as paid when payment succeeds', async () => {
    const orderService = require('../services/order.service');
    const markOrderPaidSpy = jest
      .spyOn(orderService, 'markOrderPaid')
      .mockResolvedValue({ id: 'order-321', status: 'paid' });
    const markOrderFailedSpy = jest.spyOn(orderService, 'markOrderFailed').mockResolvedValue({});

    const paymentService = require('../services/payment.service');

    await paymentService.handleOrderCreated({ orderId: 'order-321', userId: 'user-9', amount: 199.99 });

    expect(markOrderPaidSpy).toHaveBeenCalledWith(
      'order-321',
      expect.objectContaining({ transactionId: expect.any(String), paymentDetails: expect.any(Object) })
    );
    expect(markOrderFailedSpy).not.toHaveBeenCalled();
  });

  it('sends notification on payment failure', async () => {
    const notificationService = require('../services/notification.service');
    const sent = [];
    notificationService.setTransport({
      async send(notification) {
        sent.push(notification);
      },
    });
    notificationService.sentNotifications.clear();

    await notificationService.handleOrderFailed({ orderId: 'order-500', userId: 'user-42', error: 'declined' });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'order-failed', orderId: 'order-500' });
  });

  it('executes payment and notification pipeline via event bus', async () => {
    const orderEvents = require('../events/order.events');
    const eventBus = require('../events/eventBus');
    const orderService = require('../services/order.service');
    const notificationService = require('../services/notification.service');

    const notifications = [];
    notificationService.setTransport({
      async send(payload) {
        notifications.push(payload);
      },
    });
    notificationService.sentNotifications.clear();

    require('../workers/payment.worker');
    require('../workers/notification.worker');

    const markOrderPaidSpy = jest
      .spyOn(orderService, 'markOrderPaid')
      .mockImplementation(async (orderId, context) => {
        await orderEvents.publishOrderPaid({
          orderId,
          userId: 'user-88',
          status: 'paid',
        });
        return { id: orderId, user_id: 'user-88', status: 'paid' };
      });
    jest.spyOn(orderService, 'markOrderFailed').mockResolvedValue({});

    require('../services/payment.service');

    await eventBus.publish(orderEvents.ORDER_EVENTS.ORDER_CREATED, {
      orderId: 'order-pipeline',
      userId: 'user-88',
      amount: 250,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(markOrderPaidSpy).toHaveBeenCalledWith(
      'order-pipeline',
      expect.objectContaining({ transactionId: expect.any(String) })
    );
    expect(notifications.some((entry) => entry.type === 'order-paid')).toBe(true);
  });
});
