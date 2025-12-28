/**
 * Workers Index
 * Initialize all background workers
 */

import './payment.worker';
import './notification.worker';
import './recommendation.worker';
import './analytics.worker';
import './commission.worker';

export default true;

// CommonJS compatibility
module.exports = true;
