'use strict';

const eventBus = require('./eventBus');

const ORDER_EVENTS = {
  CREATED: 'order.created',
  PAID: 'order.paid',
  SHIPPED: 'order.shipped',
  COMPLETED: 'order.completed',
  FAILED: 'order.failed',
  MERGED: 'order.merged',
  CANCELLED: 'order.cancelled',
};

const normalizeOrder = (order) => {
  if (!order) {
    return {};
  }

  if (typeof order.get === 'function') {
    return order.get({ plain: true });
  }

  return order;
};

const buildPayload = (order, extra = {}) => {
  const normalized = normalizeOrder(order);

  return {
    orderId: normalized.id,
    userId: normalized.user_id || extra.userId || null,
    storeId: normalized.store_id || extra.storeId || null,
    status: normalized.status,
    paymentStatus: normalized.payment_status,
    total: normalized.total ? parseFloat(normalized.total) : extra.total,
    currency: normalized.currency || extra.currency || 'TRY',
    version:
      extra.version ||
      (normalized.updated_at ? new Date(normalized.updated_at).getTime() : Date.now()),
    timestamp: extra.timestamp || new Date().toISOString(),
    ...extra,
  };
};

const publishOrderCreated = async (order, extra = {}) =>
  eventBus.publish(ORDER_EVENTS.CREATED, buildPayload(order, extra));

const publishOrderPaid = async (order, extra = {}) =>
  eventBus.publish(ORDER_EVENTS.PAID, buildPayload(order, extra));

const publishOrderShipped = async (order, extra = {}) =>
  eventBus.publish(ORDER_EVENTS.SHIPPED, buildPayload(order, extra));

const publishOrderCompleted = async (order, extra = {}) =>
  eventBus.publish(ORDER_EVENTS.COMPLETED, buildPayload(order, extra));

const publishOrderFailed = async (order, extra = {}) =>
  eventBus.publish(ORDER_EVENTS.FAILED, buildPayload(order, extra));

module.exports = {
  ORDER_EVENTS,
  publishOrderCreated,
  publishOrderPaid,
  publishOrderShipped,
  publishOrderCompleted,
  publishOrderFailed,
  buildPayload,
};
