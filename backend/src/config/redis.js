/**
 * Redis Configuration
 * Used for caching, sessions, and Bull queue
 */

require('dotenv').config();
const Redis = require('ioredis');

const logger = require('../utils/logger');

// Redis client for general caching
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

// Event listeners
redisClient.on('connect', () => {
  logger.info('Redis connection established');
});

redisClient.on('error', (err) => {
  logger.error('Redis error: %s', err.message);
});

redisClient.on('ready', () => {
  logger.debug('Redis ready to accept commands');
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

// Helper functions for common caching operations
const cache = {
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('Cache GET error for key %s: %s', key, error.message);
      return null;
    }
  },

  /**
   * Set cached data with expiration
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 1 hour)
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 3600) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn('Cache SET error for key %s: %s', key, error.message);
      return false;
    }
  },

  /**
   * Delete cached data
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.warn('Cache DEL error for key %s: %s', key, error.message);
      return false;
    }
  },

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., 'products:*')
   * @returns {Promise<number>} - Number of deleted keys
   */
  async delPattern(pattern) {
    try {
      let deleted = 0;
      const stream = redisClient.scanStream({ match: pattern, count: 100 });
      const pipeline = redisClient.pipeline();

      await new Promise((resolve, reject) => {
        stream.on('data', (keys) => {
          if (keys.length) {
            keys.forEach((key) => {
              pipeline.del(key);
              deleted += 1;
            });
          }
        });

        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (deleted > 0) {
        await pipeline.exec();
      }

      return deleted;
    } catch (error) {
      logger.warn('Cache DEL PATTERN error for %s: %s', pattern, error.message);
      return 0;
    }
  },

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn('Cache EXISTS error for key %s: %s', key, error.message);
      return false;
    }
  },

  /**
   * Increment a counter
   * @param {string} key - Cache key
   * @returns {Promise<number>}
   */
  async incr(key) {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.warn('Cache INCR error for key %s: %s', key, error.message);
      return 0;
    }
  },

  /**
   * Set expiration time
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, ttl) {
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      logger.warn('Cache EXPIRE error for key %s: %s', key, error.message);
      return false;
    }
  },
};

module.exports = {
  redisClient,
  cache,
};
