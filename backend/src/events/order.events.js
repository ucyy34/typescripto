const eventBus = require('./eventBus');

const ORDER_EVENTS = {
  CREATED: 'order.created',
  PAID: 'order.paid',
  SHIPPED: 'order.shipped',
  COMPLETED: 'order.completed',
  FAILED: 'order.failed',
};

const publishOrderEvent = (type, payload) =>
  eventBus.publish(type, {
    ...payload,
    version: payload.version || Date.now(),
  });

module.exports = {
  ORDER_EVENTS,
  publishOrderEvent,
};
