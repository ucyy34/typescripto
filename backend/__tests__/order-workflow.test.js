describe('Event-driven order workflow', () => {
  let orderEvents;
  let eventBus;
  let notificationService;
  let analyticsService;
  let commissionService;
  let orderService;
  let notificationTransport;

  beforeEach(() => {
    process.env.EVENT_BUS_MODE = 'memory';
    jest.resetModules();

    orderEvents = require('../src/events/order.events');
    eventBus = require('../src/events/eventBus');
    notificationService = require('../src/services/notification.service');
    analyticsService = require('../src/services/analytics.service');
    commissionService = require('../src/services/commission.service');
    orderService = require('../src/services/order.service');

    notificationService.reset();
    analyticsService.reset();
    commissionService.resetProcessedOrders();

    notificationTransport = { send: jest.fn().mockResolvedValue(true) };
    notificationService.setTransport(notificationTransport);

    jest.spyOn(commissionService, 'handleOrderPaid').mockResolvedValue({ id: 'commission-1' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('emits notifications, analytics and commissions for the full order lifecycle exactly once', async () => {
    const basePayload = {
      orderId: 'order-123',
      userId: 'user-42',
      storeId: 'store-77',
      total: 450,
    };

    jest.spyOn(orderService, 'markOrderPaid').mockImplementation(async (orderId) => {
      await orderEvents.publishOrderPaid({
        orderId,
        userId: basePayload.userId,
        storeId: basePayload.storeId,
        total: basePayload.total,
      });

      return {
        id: orderId,
        user_id: basePayload.userId,
        store_id: basePayload.storeId,
        total: basePayload.total,
        status: 'paid',
        payment_status: 'paid',
      };
    });
    jest.spyOn(orderService, 'markOrderFailed').mockResolvedValue(null);

    require('../src/workers');

    await eventBus.publish(orderEvents.ORDER_EVENTS.ORDER_CREATED, basePayload);
    await eventBus.publish(orderEvents.ORDER_EVENTS.ORDER_SHIPPED, {
      ...basePayload,
      trackingNumber: 'TRK-1',
    });
    await eventBus.publish(orderEvents.ORDER_EVENTS.ORDER_COMPLETED, {
      ...basePayload,
      deliveredAt: new Date().toISOString(),
    });

    // Publish duplicates that should be ignored
    await eventBus.publish(orderEvents.ORDER_EVENTS.ORDER_COMPLETED, {
      ...basePayload,
      deliveredAt: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(notificationTransport.send).toHaveBeenCalledTimes(4);
    const notificationTypes = notificationTransport.send.mock.calls.map((call) => call[0].type);
    expect(new Set(notificationTypes)).toEqual(
      new Set(['order-created', 'order-paid', 'order-shipped', 'order-completed'])
    );

    const metrics = analyticsService.getMetrics('store-77');
    expect(metrics.ordersCreated).toBe(1);
    expect(metrics.ordersPaid).toBe(1);
    expect(metrics.ordersShipped).toBe(1);
    expect(metrics.ordersCompleted).toBe(1);
    expect(metrics.revenue).toBeCloseTo(450);

    expect(commissionService.handleOrderPaid).toHaveBeenCalledTimes(1);
  });
});
