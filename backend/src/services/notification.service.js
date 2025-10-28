const logger = require('../utils/logger');

class NotificationService {
  async notifyPaymentSuccess(event) {
    logger.info('NotificationService: payment success notification queued', event);
    return { type: 'payment_success', notified: true };
  }

  async notifyPaymentFailure(event) {
    logger.warn('NotificationService: payment failure notification queued', event);
    return { type: 'payment_failure', notified: true };
  }

  async notifyOrderShipped(event) {
    logger.info('NotificationService: order shipped notification queued', event);
    return { type: 'order_shipped', notified: true };
  }
}

module.exports = new NotificationService();
