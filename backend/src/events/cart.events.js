const eventBus = require('./eventBus');

const CART_EVENTS = {
  UPDATED: 'cart.updated',
  MERGED: 'cart.merged',
  CHECKED_OUT: 'cart.checkedout',
};

const publishCartEvent = (type, payload) =>
  eventBus.publish(type, {
    ...payload,
    version: payload.version || Date.now(),
  });

module.exports = {
  CART_EVENTS,
  publishCartEvent,
};
