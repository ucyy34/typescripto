const eventBus = require('./eventBus');

const PAYMENT_EVENTS = {
  REQUESTED: 'payment.requested',
  SUCCEEDED: 'payment.succeeded',
  FAILED: 'payment.failed',
};

const publishPaymentEvent = (type, payload) =>
  eventBus.publish(type, {
    ...payload,
    version: payload.version || Date.now(),
  });

module.exports = {
  PAYMENT_EVENTS,
  publishPaymentEvent,
};
