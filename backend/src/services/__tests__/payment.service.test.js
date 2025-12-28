jest.mock('../../events/order.events', () => ({
  publishOrderPaid: jest.fn(),
  publishOrderFailed: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../models', () => ({
  Order: {
    update: jest.fn(),
  },
}));

const paymentService = require('../payment.service');
const { publishOrderPaid } = require('../../events/order.events');
const { Order } = require('../../models');

describe('PaymentService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates order status via Model and publishes event on succeess', async () => {
    Order.update.mockResolvedValue([1]); // 1 row updated

    const result = await paymentService.markPaymentSuccessful('order-1', { transactionId: 'txn-1' });

    // Expect DB Update
    expect(Order.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paid', payment_status: 'paid' }),
      { where: { id: 'order-1' } }
    );

    // Expect Event
    expect(publishOrderPaid).toHaveBeenCalledWith({
      orderId: 'order-1',
      transactionId: 'txn-1',
    });

    expect(result).toMatchObject({ orderId: 'order-1', status: 'paid' });
  });
});
