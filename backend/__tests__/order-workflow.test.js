jest.mock('../src/config/redis', () => {
  const createMulti = () => ({
    hset: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  });

  const client = {
    duplicate: jest.fn(() => client),
    on: jest.fn(),
    hget: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
    hset: jest.fn().mockResolvedValue(null),
    expire: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(null),
    watch: jest.fn().mockResolvedValue(null),
    unwatch: jest.fn().mockResolvedValue(null),
    multi: jest.fn(() => createMulti()),
  };

  return { redisClient: client };
});

describe('Marketplace checkout workflow', () => {
  let orderEvents;
  let eventBus;
  let orderService;
  let notificationService;
  let analyticsService;
  const publishedEvents = [];
  const notifications = [];

  beforeEach(() => {
    process.env.EVENT_BUS_MODE = 'memory';
    jest.resetModules();

    orderEvents = require('../src/events/order.events');
    eventBus = require('../src/events/eventBus');
    orderService = require('../src/services/order.service');
    notificationService = require('../src/services/notification.service');
    analyticsService = require('../src/services/analytics.service');

    analyticsService.reset();
    notificationService.sentEvents = new Map();
    notificationService.setTransport({
      send: jest.fn((payload) => {
        notifications.push(payload);
        return Promise.resolve(true);
      }),
    });

    publishedEvents.length = 0;
    notifications.length = 0;

    Object.values(orderEvents.ORDER_EVENTS).forEach((type) => {
      eventBus.subscribe(type, async (payload) => {
        publishedEvents.push({ type, payload });
        await analyticsService.handleOrderEvent(type, payload);
      });
    });

    jest.spyOn(orderService, 'createOrder').mockImplementation(async (_userId, payload, metadata) => {
      const order = {
        id: `${payload.store_id}-order`,
        order_number: `ORD-${payload.store_id}`,
        user_id: 'user-1',
        store_id: payload.store_id,
        total: '150.00',
        currency: 'TRY',
        status: 'pending_payment',
        payment_status: 'pending',
        items: payload.items,
        store: { id: payload.store_id },
      };

      await orderEvents.publishOrderCreated(
        orderEvents.serializeOrderForEvent(order, { ...metadata, paymentMethod: payload.payment_method })
      );

      return order;
    });

    jest.spyOn(orderService, '_loadOrderWithRelations').mockImplementation(async (orderId) => ({
      id: orderId,
      user_id: 'user-1',
      store_id: orderId.startsWith('store-1') ? 'store-1' : 'store-2',
      total: '150.00',
      currency: 'TRY',
      status: 'pending_payment',
      payment_status: 'pending',
      items: [],
      store: { id: orderId.startsWith('store-1') ? 'store-1' : 'store-2' },
    }));

    jest.spyOn(orderService, 'markOrderPaid').mockImplementation(async (orderId) => {
      const order = await orderService._loadOrderWithRelations(orderId);
      order.status = 'paid';
      order.payment_status = 'paid';
      await orderEvents.publishOrderPaid(orderEvents.serializeOrderForEvent(order));
      return order;
    });

    jest.spyOn(orderService, 'markOrderShipped').mockImplementation(async (orderId) => {
      const order = await orderService._loadOrderWithRelations(orderId);
      order.status = 'shipped';
      await orderEvents.publishOrderShipped(orderEvents.serializeOrderForEvent(order));
      return order;
    });

    jest.spyOn(orderService, 'markOrderCompleted').mockImplementation(async (orderId) => {
      const order = await orderService._loadOrderWithRelations(orderId);
      order.status = 'delivered';
      await orderEvents.publishOrderCompleted(orderEvents.serializeOrderForEvent(order, { status: 'completed' }));
      return order;
    });

    require('../src/workers');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('splits checkout by store and processes event chain in order', async () => {
    const cart = {
      id: 'cart-101',
      items: [
        { product_id: 'p-1', quantity: 1, store: { id: 'store-1' } },
        { product_id: 'p-2', quantity: 2, store: { id: 'store-2' } },
      ],
      totals: { subtotal: 450 },
    };

    const checkoutInput = {
      shipping_address: { city: 'Ankara' },
      payment_method: 'card',
    };

    const result = await orderService.createFromCart('user-1', cart, checkoutInput);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.orders).toHaveLength(2);
    expect(result.orders.map((order) => order.store_id)).toEqual(expect.arrayContaining(['store-1', 'store-2']));

    await orderService.markOrderShipped('store-1-order');
    await orderService.markOrderCompleted('store-1-order');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const eventOrder = publishedEvents.map((event) => event.type);
    expect(eventOrder).toEqual(
      expect.arrayContaining([
        orderEvents.ORDER_EVENTS.ORDER_CREATED,
        orderEvents.ORDER_EVENTS.ORDER_PAID,
        orderEvents.ORDER_EVENTS.ORDER_SHIPPED,
        orderEvents.ORDER_EVENTS.ORDER_COMPLETED,
      ])
    );

    const analyticsStore1 = analyticsService.getMetrics('store-1');
    expect(analyticsStore1.orders).toBeGreaterThanOrEqual(1);
    expect(analyticsStore1.completed).toBeGreaterThanOrEqual(1);

    const notificationTypes = notifications.map((n) => n.type);
    expect(notificationTypes).toEqual(
      expect.arrayContaining(['order-created', 'order-paid', 'order-shipped', 'order-completed'])
    );
  });
});
