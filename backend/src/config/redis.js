/**
 * Cache Configuration
 * In-memory cache implementation (Redis removed for simplicity)
 * 
 * NOTE: This project doesn't use Redis. All caching is done in-memory.
 * For production scaling, consider adding Redis back.
 */

require('dotenv').config();

/**
 * Creates an in-memory cache client with Redis-like API
 * This allows existing code to work without modification
 */
const createInMemoryClient = () => {
  const kvStore = new Map();
  const hashStore = new Map();
  const expirations = new Map();

  // Cleanup expired keys periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, expireAt] of expirations.entries()) {
      if (now > expireAt) {
        kvStore.delete(key);
        hashStore.delete(key);
        expirations.delete(key);
      }
    }
  }, 60000); // Check every minute

  const client = {
    // Event handlers (no-op for in-memory)
    on() {
      return this;
    },

    // For BullMQ compatibility
    duplicate() {
      return this;
    },

    // Basic key-value operations
    async get(key) {
      const expireAt = expirations.get(key);
      if (expireAt && Date.now() > expireAt) {
        kvStore.delete(key);
        expirations.delete(key);
        return null;
      }
      return kvStore.has(key) ? kvStore.get(key) : null;
    },

    async set(key, value, ttlSeconds = null) {
      kvStore.set(key, value);
      if (ttlSeconds) {
        expirations.set(key, Date.now() + ttlSeconds * 1000);
      }
      return 'OK';
    },

    async setex(key, ttl, value) {
      kvStore.set(key, value);
      expirations.set(key, Date.now() + ttl * 1000);
      return 'OK';
    },

    async del(...keys) {
      let removed = 0;
      keys.forEach((key) => {
        if (kvStore.delete(key)) removed += 1;
        if (hashStore.delete(key)) removed += 1;
        expirations.delete(key);
      });
      return removed;
    },

    // Hash operations
    async hgetall(key) {
      const hash = hashStore.get(key);
      if (!hash) return {};
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

    async hget(key, field) {
      const hash = hashStore.get(key);
      return hash ? hash.get(field) : null;
    },

    // Utility operations
    async expire(key, ttl) {
      if (kvStore.has(key) || hashStore.has(key)) {
        expirations.set(key, Date.now() + ttl * 1000);
        return true;
      }
      return false;
    },

    async exists(key) {
      return kvStore.has(key) || hashStore.has(key) ? 1 : 0;
    },

    async incr(key) {
      const value = parseInt(kvStore.get(key) || '0', 10) + 1;
      kvStore.set(key, String(value));
      return value;
    },

    async ping() {
      return 'PONG';
    },

    async quit() {
      return 'OK';
    },

    async keys(pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return [...kvStore.keys(), ...hashStore.keys()].filter(k => regex.test(k));
    },

    // Watch/Unwatch (no-op for in-memory single-threaded)
    async watch() {
      return 'OK';
    },

    async unwatch() {
      return 'OK';
    },

    // Scan stream for pattern matching (simplified)
    scanStream(options = {}) {
      const pattern = options.match || '*';
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const allKeys = [...kvStore.keys(), ...hashStore.keys()].filter(k => regex.test(k));

      const listeners = {};
      const stream = {
        on(event, handler) {
          listeners[event] = handler;
          if (event === 'data') {
            setImmediate(() => handler(allKeys));
          }
          if (event === 'end') {
            setImmediate(() => handler());
          }
          return this;
        },
      };
      return stream;
    },

    // Multi/Transaction support
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
        set(key, value) {
          operations.push(() => client.set(key, value));
          return multiInterface;
        },
        async exec() {
          const results = [];
          for (const operation of operations) {
            results.push(await operation());
          }
          return results;
        },
      };
      return multiInterface;
    },
  };

  return client;
};

// Create the in-memory client
const redisClient = createInMemoryClient();

console.log('📦 Cache: Using in-memory storage (no Redis)');

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
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;
      return await redisClient.del(...keys);
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

  /**
   * Clear all cache
   * @returns {Promise<boolean>}
   */
  async clear() {
    try {
      // For in-memory, we delete all patterns
      await this.delPattern('*');
      return true;
    } catch (error) {
      console.error('Cache CLEAR error:', error.message);
      return false;
    }
  },
};

module.exports = {
  redisClient,
  cache,
};
