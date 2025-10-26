/**
 * API Cache Manager
 * Caches API responses to reduce server load and improve performance
 */

class ApiCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.cacheDuration = options.cacheDuration || 5 * 60 * 1000; // 5 minutes default
        this.maxCacheSize = options.maxCacheSize || 100; // Max 100 entries
        this.enabled = options.enabled !== false;
        
        console.log('[API Cache] Initialized with duration:', this.cacheDuration / 1000, 'seconds');
    }

    /**
     * Generate cache key from URL and params
     */
    generateKey(url, params = {}) {
        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        return paramString ? `${url}?${paramString}` : url;
    }

    /**
     * Get cached data if available and not expired
     */
    get(url, params = {}) {
        if (!this.enabled) return null;

        const key = this.generateKey(url, params);
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if expired
        const now = Date.now();
        if (now - cached.timestamp > this.cacheDuration) {
            this.cache.delete(key);
            console.log('[API Cache] Expired:', key);
            return null;
        }

        console.log('[API Cache] Hit:', key);
        return cached.data;
    }

    /**
     * Store data in cache
     */
    set(url, params = {}, data) {
        if (!this.enabled) return;

        const key = this.generateKey(url, params);
        
        // Check cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            console.log('[API Cache] Evicted oldest entry:', firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        console.log('[API Cache] Stored:', key);
    }

    /**
     * Clear specific cache entry
     */
    clear(url, params = {}) {
        const key = this.generateKey(url, params);
        this.cache.delete(key);
        console.log('[API Cache] Cleared:', key);
    }

    /**
     * Clear all cache
     */
    clearAll() {
        this.cache.clear();
        console.log('[API Cache] Cleared all cache');
    }

    /**
     * Clear cache entries matching pattern
     */
    clearPattern(pattern) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                count++;
            }
        }
        console.log(`[API Cache] Cleared ${count} entries matching:`, pattern);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            duration: this.cacheDuration,
            enabled: this.enabled
        };
    }
}

// Create global instance
window.apiCache = new ApiCache({
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 100,
    enabled: true
});

// Export
window.ApiCache = ApiCache;

console.log('💾 API Cache initialized');
