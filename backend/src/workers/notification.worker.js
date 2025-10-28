'use strict';

const NotificationService = require('../services/notification.service');

const notificationService = new NotificationService();
notificationService.register();

module.exports = notificationService;
