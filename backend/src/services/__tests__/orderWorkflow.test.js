const commissionService = require('../commission.service');

describe('Marketplace service event handlers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    if (typeof commissionService.resetProcessedOrders === 'function') {
      commissionService.resetProcessedOrders();
    }
    jest.resetModules();
  });

  test('commissionService.handleOrderPaid creates commission only once per order', async () => {
    const createTransactionSpy = jest
      .spyOn(commissionService, 'createCommissionTransaction')
      .mockResolvedValue({ id: 'commission-1' });

    await commissionService.handleOrderPaid({ orderId: 'order-abc' });
    await commissionService.handleOrderPaid({ orderId: 'order-abc' });
    await commissionService.handleOrderPaid({});

    expect(createTransactionSpy).toHaveBeenCalledTimes(1);
  });

  test('cartService.mergeGuestCartToUser merges quantities atomically', async () => {
    jest.resetModules();

    const createRedisStub = () => {
      const store = new Map();
      const redisClient = {
        __store: store,
        watch: jest.fn().mockResolvedValue(true),
        unwatch: jest.fn().mockResolvedValue(true),
        async hgetall(key) {
          return store.get(key) || {};
        },
        async hset(key, values) {
          const existing = store.get(key) || {};
          store.set(key, { ...existing, ...values });
        },
        async expire() {
          return true;
        },
        async del(key) {
          store.delete(key);
        },
        multi() {
          const commands = [];
          const transaction = {
            hset(key, values) {
              commands.push(() => redisClient.hset(key, values));
              return transaction;
            },
            expire(key, ttl) {
              commands.push(() => redisClient.expire(key, ttl));
              return transaction;
            },
            del(key) {
              commands.push(() => redisClient.del(key));
              return transaction;
            },
            async exec() {
              for (const command of commands) {
                await command();
              }
              return commands.map(() => 'OK');
            },
          };
          return transaction;
        },
      };

      return { redisClient };
    };

    const redisStub = createRedisStub();

    jest.doMock('../../config/redis', () => ({
      ...redisStub,
      cache: {},
    }));

    const cartService = require('../cart.service');
    jest.spyOn(cartService, 'validateProductAndStock').mockResolvedValue(true);
    jest
      .spyOn(cartService, 'getCart')
      .mockResolvedValue({ items: [], totals: { subtotal: 0, item_count: 0 } });

    await redisStub.redisClient.hset('cart:user:user-1', {
      items: JSON.stringify([{ product_id: 'p1', quantity: 1 }]),
    });
    await redisStub.redisClient.hset('cart:guest:guest-1', {
      items: JSON.stringify([
        { product_id: 'p1', quantity: 2 },
        { product_id: 'p2', quantity: 1 },
      ]),
    });

    await cartService.mergeGuestCartToUser('user-1', 'guest-1');

    expect(redisStub.redisClient.watch).toHaveBeenCalled();
    expect(redisStub.redisClient.unwatch).toHaveBeenCalled();

    const storedUserCart = JSON.parse(redisStub.redisClient.__store.get('cart:user:user-1').items);
    expect(storedUserCart).toEqual([
      { product_id: 'p1', quantity: 3 },
      { product_id: 'p2', quantity: 1 },
    ]);
    expect(redisStub.redisClient.__store.has('cart:guest:guest-1')).toBe(false);
    expect(cartService.validateProductAndStock).toHaveBeenCalledTimes(2);
  });
});
