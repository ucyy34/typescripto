'use strict';

const PaymentService = require('../services/payment.service');

const paymentService = new PaymentService();
paymentService.register();

module.exports = paymentService;
