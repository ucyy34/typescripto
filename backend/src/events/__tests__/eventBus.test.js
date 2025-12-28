jest.mock('../../utils/eventLogger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const eventLogger = require('../../utils/eventLogger');
const eventBus = require('../eventBus');

describe('EventBus logging sequence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logs sequential flow for marketplace orders', async () => {
    await eventBus.publish('order.created', { orderId: 'log-order-1' });
    await eventBus.publish('order.paid', { orderId: 'log-order-1' });
    await eventBus.publish('order.completed', { orderId: 'log-order-1' });

    // Flush process.nextTick queue
    await new Promise(resolve => setImmediate(resolve));

    expect(eventLogger.info).toHaveBeenNthCalledWith(
      1,
      '[EventBus] order.created',
      expect.objectContaining({ orderId: 'log-order-1', lastEvent: 'order.created' })
    );
    expect(eventLogger.info).toHaveBeenNthCalledWith(
      2,
      '[EventBus] order.created → order.paid',
      expect.objectContaining({ orderId: 'log-order-1', lastEvent: 'order.paid' })
    );
    expect(eventLogger.info).toHaveBeenNthCalledWith(
      3,
      '[EventBus] order.created → order.paid → order.completed',
      expect.objectContaining({ orderId: 'log-order-1', lastEvent: 'order.completed' })
    );
  });
});
