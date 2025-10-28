const eventBus = require('./eventBus');

const ORDER_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_COMPLETED: 'order.completed',
  ORDER_FAILED: 'order.failed',
};

const publishOrderEvent = async (type, payload) => {
  if (!payload || !payload.orderId) {
    throw new Error(`Invalid payload for ${type}`);
  }

  await eventBus.publish(type, payload);
};

const serializeOrderForEvent = (order, overrides = {}) => {
  if (!order) {
    throw new Error('Order entity is required to serialize event payload');
  }

  return {
    orderId: order.id,
    userId: order.user_id || null,
    storeId: order.store_id || null,
    status: order.status,
    paymentStatus: order.payment_status,
    total: parseFloat(order.total || 0),
    currency: order.currency || 'TRY',
    version: overrides.version || Date.now(),
    timestamp: new Date().toISOString(),
    ...overrides,
  };
};

module.exports = {
  ORDER_EVENTS,
  publishOrderCreated: (payload) => publishOrderEvent(ORDER_EVENTS.ORDER_CREATED, payload),
  publishOrderPaid: (payload) => publishOrderEvent(ORDER_EVENTS.ORDER_PAID, payload),
  publishOrderShipped: (payload) => publishOrderEvent(ORDER_EVENTS.ORDER_SHIPPED, payload),
  publishOrderCompleted: (payload) => publishOrderEvent(ORDER_EVENTS.ORDER_COMPLETED, payload),
  publishOrderFailed: (payload) => publishOrderEvent(ORDER_EVENTS.ORDER_FAILED, payload),
  serializeOrderForEvent,
};
