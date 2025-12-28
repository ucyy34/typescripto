const notificationService = require('../notification.service').default || require('../notification.service');

describe('NotificationService', () => {
  beforeEach(() => {
    // Reset internal state by clearing maps
    notificationService.sentNotifications.clear();
    notificationService.finalizedOrders.clear();
  });

  afterEach(() => {
    notificationService.setTransport({
      async send() {
        return null;
      },
    });
    notificationService.sentNotifications.clear();
    notificationService.finalizedOrders.clear();
  });

  it('sends store and customer notifications once per event type', async () => {
    const transport = { send: jest.fn().mockResolvedValue(true) };
    notificationService.setTransport(transport);

    const orderEvent = { orderId: 'order-1', storeId: 'store-1', userId: 'user-1', total: 199.9 };

    await notificationService.handleOrderCreated(orderEvent);
    await notificationService.handleOrderCreated(orderEvent);
    await notificationService.handleOrderPaid(orderEvent);
    await notificationService.handleOrderPaid(orderEvent);
    await notificationService.handleOrderShipped({ ...orderEvent, trackingNumber: 'TRK' });
    await notificationService.handleOrderCompleted({ ...orderEvent, deliveredAt: 'now' });

    expect(transport.send).toHaveBeenCalledTimes(4);
    expect(transport.send.mock.calls.map((call) => call[0].type)).toEqual([
      'order-created',
      'order-paid',
      'order-shipped',
      'order-completed',
    ]);
  });

  it('sends failure notifications with reason', async () => {
    const transport = { send: jest.fn().mockResolvedValue(true) };
    notificationService.setTransport(transport);

    await notificationService.handleOrderFailed({ orderId: 'order-2', userId: 'user-5', reason: 'Declined' });

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'order-failed',
        orderId: 'order-2',
        reason: 'Declined',
      })
    );
  });
});
