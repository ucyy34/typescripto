/**
 * Redis Configuration
 * Used for caching, sessions, and Bull queue
 */

require('dotenv').config();
const Redis = require('ioredis');

const baseOptions = {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

const createInMemoryRedisClient = () => {
  const kvStore = new Map();
  const hashStore = new Map();

  const client = {
    on() {
      return this;
    },
    duplicate() {
      return this;
    },
    async get(key) {
      return kvStore.has(key) ? kvStore.get(key) : null;
    },
    async setex(key, _ttl, value) {
      kvStore.set(key, value);
      return 'OK';
    },
    async del(...keys) {
      let removed = 0;
      keys.forEach((key) => {
        if (kvStore.delete(key)) {
          removed += 1;
        }
        if (hashStore.delete(key)) {
          removed += 1;
        }
      });
      return removed;
    },
    async hgetall(key) {
      const hash = hashStore.get(key);
      if (!hash) {
        return {};
      }
      return Object.fromEntries(hash.entries());
    },
    async hset(key, values) {
      const hash = hashStore.get(key) || new Map();
      Object.entries(values || {}).forEach(([field, value]) => {
        hash.set(field, value);
      });
      hashStore.set(key, hash);
      return 'OK';
    },
    async expire() {
      return true;
    },
    async exists(key) {
      return kvStore.has(key) || hashStore.has(key) ? 1 : 0;
    },
    async incr(key) {
      const value = parseInt(kvStore.get(key) || '0', 10) + 1;
      kvStore.set(key, String(value));
      return value;
    },
    scanStream() {
      const listeners = {};
      const stream = {
        on(event, handler) {
          listeners[event] = handler;
          if (event === 'data') {
            handler([]);
          }
          if (event === 'end') {
            setImmediate(() => handler());
          }
          return this;
        },
      };
      return stream;
    },
    multi() {
      const operations = [];
      const multiInterface = {
        hset(key, values) {
          operations.push(() => client.hset(key, values));
          return multiInterface;
        },
        expire(key, ttl) {
          operations.push(() => client.expire(key, ttl));
          return multiInterface;
        },
        del(key) {
          operations.push(() => client.del(key));
          return multiInterface;
        },
        async exec() {
          for (const operation of operations) {
            await operation();
          }
          return [];
        },
      };

      return multiInterface;
    },
  };

  return client;
};

const createRedisClient = () => {
  if (process.env.NODE_ENV === 'test' && process.env.USE_REAL_REDIS !== 'true') {
    return createInMemoryRedisClient();
  }

  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, baseOptions);
  }

  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    ...baseOptions,
  });
};

// Redis client for general caching
const redisClient = createRedisClient();

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
      const keys = [];
      const stream = redisClient.scanStream({ match: pattern, count: 100 });

      await new Promise((resolve, reject) => {
        stream.on('data', (batch) => {
          if (Array.isArray(batch) && batch.length > 0) {
            keys.push(...batch);
          }
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (keys.length === 0) {
        return 0;
      }

      let deleted = 0;
      const batchSize = 500;
      for (let i = 0; i < keys.length; i += batchSize) {
        const chunk = keys.slice(i, i + batchSize);
        const removed = await redisClient.del(...chunk);
        deleted += removed;
      }

      return deleted;
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
