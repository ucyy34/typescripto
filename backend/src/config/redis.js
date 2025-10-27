/**
 * Redis Configuration
 * Used for caching, sessions, and Bull queue
 */

require('dotenv').config();
const Redis = require('ioredis');

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
  console.log('✅ Redis: Connected successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

redisClient.on('ready', () => {
  console.log('✅ Redis: Ready to accept commands');
});

redisClient.on('close', () => {
  console.log('⚠️  Redis: Connection closed');
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
      console.error(`Cache GET error for key ${key}:`, error.message);
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
      console.error(`Cache SET error for key ${key}:`, error.message);
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
      console.error(`Cache DEL error for key ${key}:`, error.message);
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
      let cursor = '0';
      let totalDeleted = 0;

      do {
        // SCAN to avoid blocking Redis when there are many keys
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          const pipeline = redisClient.pipeline();
          keys.forEach((key) => pipeline.del(key));
          await pipeline.exec();
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      if (totalDeleted > 0) {
        console.log(`Cache DEL PATTERN removed ${totalDeleted} keys for pattern ${pattern}`);
      }

      return totalDeleted;
    } catch (error) {
      console.error(`Cache DEL PATTERN error for ${pattern}:`, error.message);
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
      console.error(`Cache EXISTS error for key ${key}:`, error.message);
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
      console.error(`Cache INCR error for key ${key}:`, error.message);
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
      console.error(`Cache EXPIRE error for key ${key}:`, error.message);
      return false;
    }
  },
};

module.exports = {
  redisClient,
  cache,
};
