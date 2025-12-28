/**
 * Cache Configuration
 * In-memory cache implementation (Redis removed for simplicity)
 * 
 * NOTE: This project doesn't use Redis. All caching is done in-memory.
 * For production scaling, consider adding Redis back.
 */

import dotenv from 'dotenv';
dotenv.config();

interface InMemoryClient {
    on: () => InMemoryClient;
    duplicate: () => InMemoryClient;
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ttlSeconds?: number | null) => Promise<string>;
    setex: (key: string, ttl: number, value: string) => Promise<string>;
    del: (...keys: string[]) => Promise<number>;
    hgetall: (key: string) => Promise<Record<string, string>>;
    hset: (key: string, values: Record<string, string>) => Promise<string>;
    hget: (key: string, field: string) => Promise<string | null>;
    expire: (key: string, ttl: number) => Promise<boolean>;
    exists: (key: string) => Promise<number>;
    incr: (key: string) => Promise<number>;
    ping: () => Promise<string>;
    quit: () => Promise<string>;
    keys: (pattern: string) => Promise<string[]>;
    watch: () => Promise<string>;
    unwatch: () => Promise<string>;
    scanStream: (options?: { match?: string }) => { on: (event: string, handler: (data?: unknown) => void) => unknown };
    multi: () => MultiInterface;
}

interface MultiInterface {
    hset: (key: string, values: Record<string, string>) => MultiInterface;
    expire: (key: string, ttl: number) => MultiInterface;
    del: (key: string) => MultiInterface;
    set: (key: string, value: string) => MultiInterface;
    exec: () => Promise<unknown[]>;
}

interface CacheInterface {
    get: (key: string) => Promise<unknown | null>;
    set: (key: string, value: unknown, ttl?: number) => Promise<boolean>;
    del: (key: string) => Promise<boolean>;
    delPattern: (pattern: string) => Promise<number>;
    exists: (key: string) => Promise<boolean>;
    incr: (key: string) => Promise<number>;
    expire: (key: string, ttl: number) => Promise<boolean>;
    clear: () => Promise<boolean>;
}

/**
 * Creates an in-memory cache client with Redis-like API
 * This allows existing code to work without modification
 */
const createInMemoryClient = (): InMemoryClient => {
    const kvStore = new Map<string, string>();
    const hashStore = new Map<string, Map<string, string>>();
    const expirations = new Map<string, number>();

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

    const client: InMemoryClient = {
        // Event handlers (no-op for in-memory)
        on() {
            return this;
        },

        // For BullMQ compatibility
        duplicate() {
            return this;
        },

        // Basic key-value operations
        async get(key: string): Promise<string | null> {
            const expireAt = expirations.get(key);
            if (expireAt && Date.now() > expireAt) {
                kvStore.delete(key);
                expirations.delete(key);
                return null;
            }
            return kvStore.has(key) ? kvStore.get(key)! : null;
        },

        async set(key: string, value: string, ttlSeconds: number | null = null): Promise<string> {
            kvStore.set(key, value);
            if (ttlSeconds) {
                expirations.set(key, Date.now() + ttlSeconds * 1000);
            }
            return 'OK';
        },

        async setex(key: string, ttl: number, value: string): Promise<string> {
            kvStore.set(key, value);
            expirations.set(key, Date.now() + ttl * 1000);
            return 'OK';
        },

        async del(...keys: string[]): Promise<number> {
            let removed = 0;
            keys.forEach((key) => {
                if (kvStore.delete(key)) removed += 1;
                if (hashStore.delete(key)) removed += 1;
                expirations.delete(key);
            });
            return removed;
        },

        // Hash operations
        async hgetall(key: string): Promise<Record<string, string>> {
            const hash = hashStore.get(key);
            if (!hash) return {};
            return Object.fromEntries(hash.entries());
        },

        async hset(key: string, values: Record<string, string>): Promise<string> {
            const hash = hashStore.get(key) || new Map<string, string>();
            Object.entries(values || {}).forEach(([field, value]) => {
                hash.set(field, value);
            });
            hashStore.set(key, hash);
            return 'OK';
        },

        async hget(key: string, field: string): Promise<string | null> {
            const hash = hashStore.get(key);
            return hash ? hash.get(field) || null : null;
        },

        // Utility operations
        async expire(key: string, ttl: number): Promise<boolean> {
            if (kvStore.has(key) || hashStore.has(key)) {
                expirations.set(key, Date.now() + ttl * 1000);
                return true;
            }
            return false;
        },

        async exists(key: string): Promise<number> {
            return kvStore.has(key) || hashStore.has(key) ? 1 : 0;
        },

        async incr(key: string): Promise<number> {
            const value = parseInt(kvStore.get(key) || '0', 10) + 1;
            kvStore.set(key, String(value));
            return value;
        },

        async ping(): Promise<string> {
            return 'PONG';
        },

        async quit(): Promise<string> {
            return 'OK';
        },

        async keys(pattern: string): Promise<string[]> {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return [...kvStore.keys(), ...hashStore.keys()].filter(k => regex.test(k));
        },

        // Watch/Unwatch (no-op for in-memory single-threaded)
        async watch(): Promise<string> {
            return 'OK';
        },

        async unwatch(): Promise<string> {
            return 'OK';
        },

        // Scan stream for pattern matching (simplified)
        scanStream(options: { match?: string } = {}) {
            const pattern = options.match || '*';
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            const allKeys = [...kvStore.keys(), ...hashStore.keys()].filter(k => regex.test(k));

            const listeners: Record<string, (data?: unknown) => void> = {};
            const stream = {
                on(event: string, handler: (data?: unknown) => void) {
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
        multi(): MultiInterface {
            const operations: Array<() => Promise<unknown>> = [];
            const multiInterface: MultiInterface = {
                hset(key: string, values: Record<string, string>) {
                    operations.push(() => client.hset(key, values));
                    return multiInterface;
                },
                expire(key: string, ttl: number) {
                    operations.push(() => client.expire(key, ttl));
                    return multiInterface;
                },
                del(key: string) {
                    operations.push(() => client.del(key));
                    return multiInterface;
                },
                set(key: string, value: string) {
                    operations.push(() => client.set(key, value));
                    return multiInterface;
                },
                async exec(): Promise<unknown[]> {
                    const results: unknown[] = [];
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
const cache: CacheInterface = {
    /**
     * Get cached data
     */
    async get(key: string): Promise<unknown | null> {
        try {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error: any) {
            console.error(`Cache GET error for key ${key}:`, error.message);
            return null;
        }
    },

    /**
     * Set cached data with expiration
     */
    async set(key: string, value: unknown, ttl: number = 3600): Promise<boolean> {
        try {
            await redisClient.setex(key, ttl, JSON.stringify(value));
            return true;
        } catch (error: any) {
            console.error(`Cache SET error for key ${key}:`, error.message);
            return false;
        }
    },

    /**
     * Delete cached data
     */
    async del(key: string): Promise<boolean> {
        try {
            await redisClient.del(key);
            return true;
        } catch (error: any) {
            console.error(`Cache DEL error for key ${key}:`, error.message);
            return false;
        }
    },

    /**
     * Delete all keys matching a pattern
     */
    async delPattern(pattern: string): Promise<number> {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length === 0) return 0;
            return await redisClient.del(...keys);
        } catch (error: any) {
            console.error(`Cache DEL PATTERN error for ${pattern}:`, error.message);
            return 0;
        }
    },

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error: any) {
            console.error(`Cache EXISTS error for key ${key}:`, error.message);
            return false;
        }
    },

    /**
     * Increment a counter
     */
    async incr(key: string): Promise<number> {
        try {
            return await redisClient.incr(key);
        } catch (error: any) {
            console.error(`Cache INCR error for key ${key}:`, error.message);
            return 0;
        }
    },

    /**
     * Set expiration time
     */
    async expire(key: string, ttl: number): Promise<boolean> {
        try {
            await redisClient.expire(key, ttl);
            return true;
        } catch (error: any) {
            console.error(`Cache EXPIRE error for key ${key}:`, error.message);
            return false;
        }
    },

    /**
     * Clear all cache
     */
    async clear(): Promise<boolean> {
        try {
            // For in-memory, we delete all patterns
            await this.delPattern('*');
            return true;
        } catch (error: any) {
            console.error('Cache CLEAR error:', error.message);
            return false;
        }
    },
};

export { redisClient, cache };

// CommonJS compatibility
module.exports = {
    redisClient,
    cache,
};
