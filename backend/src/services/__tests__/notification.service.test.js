const notificationService = require('../notification.service');

describe('NotificationService', () => {
  afterEach(() => {
    notificationService.setTransport({
      async send() {
        return null;
      },
    });
  });

  it('sends a notification on order.failed event', async () => {
    const transport = { send: jest.fn().mockResolvedValue(true) };
    notificationService.setTransport(transport);

    await notificationService.handleOrderFailed({ orderId: 'order-1', userId: 'user-1', reason: 'Declined' });

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'order-failed',
        orderId: 'order-1',
        reason: 'Declined',
      })
    );
  });
});
