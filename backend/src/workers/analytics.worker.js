'use strict';

const AnalyticsService = require('../services/analytics.service');

const analyticsService = new AnalyticsService();
analyticsService.register();

module.exports = analyticsService;
