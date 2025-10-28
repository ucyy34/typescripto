const paymentService = require('../services/payment.service');

let initialized = false;

module.exports = () => {
  if (initialized) {
    return;
  }

  paymentService.initializeSubscribers();
  initialized = true;
};
