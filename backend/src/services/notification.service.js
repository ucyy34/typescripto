const logger = require('../utils/logger');
const eventBus = require('../events/eventBus');
const { ORDER_EVENTS } = require('../events/order.events');

class NotificationService {
  constructor() {
    this.initialized = false;
    this.registerConsumers();
  }

  registerConsumers() {
    if (this.initialized || process.env.EVENT_CONSUMERS_DISABLED === 'true') {
      return;
    }

    eventBus.subscribe(ORDER_EVENTS.PAID, async (payload) => {
      await this.handleOrderPaid(payload);
    });

    eventBus.subscribe(ORDER_EVENTS.FAILED, async (payload) => {
      await this.handleOrderFailed(payload);
    });

    eventBus.subscribe(ORDER_EVENTS.SHIPPED, async (payload) => {
      await this.handleOrderShipped(payload);
    });

    eventBus.subscribe(ORDER_EVENTS.COMPLETED, async (payload) => {
      await this.handleOrderCompleted(payload);
    });

    this.initialized = true;
  }

  async handleOrderPaid(payload) {
    await this.sendNotification(payload.userId, `Order ${payload.orderId} payment confirmed`);
  }

  async handleOrderFailed(payload) {
    await this.sendNotification(payload.userId, `Order ${payload.orderId} payment failed: ${payload.error}`);
  }

  async handleOrderShipped(payload) {
    await this.sendNotification(
      payload.userId,
      `Order ${payload.orderId} shipped with tracking ${payload.trackingNumber || 'pending'}`
    );
  }

  async handleOrderCompleted(payload) {
    await this.sendNotification(payload.userId, `Order ${payload.orderId} completed. Enjoy!`);
  }

  async sendNotification(userId, message) {
    logger.info('Notification to %s: %s', userId || 'guest', message);
  }
}

const notificationService = new NotificationService();

module.exports = notificationService;
module.exports.NotificationService = NotificationService;
