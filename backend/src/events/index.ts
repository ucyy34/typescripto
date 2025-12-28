/**
 * Events Index
 * Initialize all event workers
 */

import '../workers/payment.worker';
import '../workers/notification.worker';
import '../workers/recommendation.worker';
import '../workers/analytics.worker';
import '../workers/commission.worker';

export { };

// CommonJS compatibility
module.exports = {};
