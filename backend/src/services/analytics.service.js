const path = require('path');
const fs = require('fs');

const analyticsLog = path.resolve(__dirname, '..', '..', 'logs', 'analytics.log');

if (!fs.existsSync(path.dirname(analyticsLog))) {
  fs.mkdirSync(path.dirname(analyticsLog), { recursive: true });
}

class AnalyticsService {
  async trackEvent(event) {
    const record = {
      ...event,
      recordedAt: new Date().toISOString(),
    };

    fs.appendFileSync(analyticsLog, `${JSON.stringify(record)}\n`);
    return record;
  }
}

module.exports = new AnalyticsService();
