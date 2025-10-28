const eventBus = require('./eventBus');

const ORDER_EVENTS = {
  CREATED: 'order.created',
  PAID: 'order.paid',
  SHIPPED: 'order.shipped',
  COMPLETED: 'order.completed',
  FAILED: 'order.failed',
  MERGED: 'order.merged',
  UPDATED: 'order.updated',
  CHECKED_OUT: 'order.checkedout',
};

const publishOrderEvent = async (type, payload = {}, jobOptions = {}) => {
  return eventBus.publish(type, payload, jobOptions);
};

module.exports = {
  ORDER_EVENTS,
  publishOrderEvent,
};
