describe('Event-driven order pipeline', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits checkout event when creating order from cart', async () => {
    const orderEvents = require('../events/order.events');
    const publishSpy = jest.spyOn(orderEvents, 'publishOrderEvent').mockResolvedValue(null);

    const orderService = require('../services/order.service');
    const originalCreateOrder = orderService.createOrder;
    const mockOrder = { id: 'order-123', status: 'pending_payment', currency: 'TRY' };
    orderService.createOrder = jest.fn().mockResolvedValue(mockOrder);

    await orderService.createOrderFromCart({
      userId: 'user-1',
      cart: {
        id: 'cart-1',
        items: [
          {
            product_id: 'product-1',
            quantity: 1,
            store: { id: 'store-1' },
          },
        ],
      },
      checkoutInput: {
        store_id: 'store-1',
        shipping_address: {
          full_name: 'Test User',
          phone: '+905551112233',
          address_line1: 'Cumhuriyet Cd. No:1',
          city: 'Istanbul',
          postal_code: '34000',
          country: 'TR',
        },
        payment_method: 'credit_card',
      },
    });

    expect(orderService.createOrder).toHaveBeenCalledWith('user-1', expect.any(Object));
    expect(publishSpy).toHaveBeenCalledWith(
      orderEvents.ORDER_EVENTS.CHECKED_OUT,
      expect.objectContaining({ orderId: 'order-123', userId: 'user-1', cartId: 'cart-1' })
    );

    orderService.createOrder = originalCreateOrder;
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
    const notifySpy = jest.spyOn(notificationService, 'sendNotification').mockResolvedValue();

    await notificationService.handleOrderFailed({ orderId: 'order-500', userId: 'user-42', error: 'declined' });

    expect(notifySpy).toHaveBeenCalledWith('user-42', expect.stringContaining('payment failed'));
  });

  it('executes payment and notification pipeline via event bus', async () => {
    const notifications = [];
    const orderEvents = require('../events/order.events');
    const eventBus = require('../events/eventBus');
    const orderService = require('../services/order.service');
    const notificationService = require('../services/notification.service');

    const markOrderPaidSpy = jest
      .spyOn(orderService, 'markOrderPaid')
      .mockImplementation(async (orderId, context) => {
        await orderEvents.publishOrderEvent(orderEvents.ORDER_EVENTS.PAID, {
          orderId,
          userId: 'user-88',
          status: 'paid',
        });
        return { id: orderId, user_id: 'user-88', status: 'paid' };
      });
    jest.spyOn(orderService, 'markOrderFailed').mockResolvedValue({});
    const notifySpy = jest
      .spyOn(notificationService, 'sendNotification')
      .mockImplementation(async (userId, message) => {
        notifications.push({ userId, message });
      });

    require('../services/payment.service');

    await eventBus.publish(orderEvents.ORDER_EVENTS.CREATED, {
      orderId: 'order-pipeline',
      userId: 'user-88',
      amount: 250,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(markOrderPaidSpy).toHaveBeenCalledWith(
      'order-pipeline',
      expect.objectContaining({ transactionId: expect.any(String) })
    );
    expect(notifySpy).toHaveBeenCalled();
    expect(notifications.some((entry) => entry.message.includes('order-pipeline'))).toBe(true);
  });
});
