jest.mock('../order.service', () => ({
  markOrderPaid: jest.fn(),
  markOrderFailed: jest.fn(),
}));

const orderService = require('../order.service');
const paymentService = require('../payment.service');

describe('PaymentService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates order status on successful payment', async () => {
    orderService.markOrderPaid.mockResolvedValue({ id: 'order-1', status: 'paid' });

    const result = await paymentService.markPaymentSuccessful('order-1', { transactionId: 'txn-1' });

    expect(orderService.markOrderPaid).toHaveBeenCalledWith('order-1', {
      transactionId: 'txn-1',
    });
    expect(result).toEqual({ id: 'order-1', status: 'paid' });
  });
});
