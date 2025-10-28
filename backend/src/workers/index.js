const initializePaymentWorker = require('./payment.worker');
const initializeNotificationWorker = require('./notification.worker');
const initializeRecommendationWorker = require('./recommendation.worker');
const initializeAnalyticsWorker = require('./analytics.worker');

module.exports = () => {
  initializePaymentWorker();
  initializeNotificationWorker();
  initializeRecommendationWorker();
  initializeAnalyticsWorker();
};
