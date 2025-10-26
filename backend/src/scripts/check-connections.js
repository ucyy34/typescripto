require('dotenv').config();

const { testConnection, closeConnection } = require('../config/sequelize');
const { redisClient } = require('../config/redis');

(async () => {
  try {
    console.log('Checking PostgreSQL connection...');
    const ok = await testConnection();
    console.log('PostgreSQL OK:', ok);

    console.log('Checking Redis connection...');
    const pong = await redisClient.ping();
    console.log('Redis PING:', pong);

    await redisClient.quit();
    await closeConnection();
    console.log('Connections closed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Connection check error:', e && e.message ? e.message : e);
    try { await closeConnection(); } catch (_) {}
    try { await redisClient.quit(); } catch (_) {}
    process.exit(1);
  }
})();

