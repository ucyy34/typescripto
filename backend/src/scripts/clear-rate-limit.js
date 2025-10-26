/**
 * Clear Redis rate limiting keys
 */

const { redisClient } = require('../config/redis');

async function clearRateLimits() {
    try {
        console.log('🔧 Clearing rate limits...');

        // Clear all rate limit keys
        const keys = await redisClient.keys('rate-limit:*');
        console.log(`Found ${keys.length} rate limit keys`);

        if (keys.length > 0) {
            await redisClient.del(...keys);
            console.log(`✅ Cleared ${keys.length} rate limit keys`);
        } else {
            console.log('✅ No rate limit keys found');
        }

        // Close Redis connection
        await redisClient.quit();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing rate limits:', error);
        process.exit(1);
    }
}

clearRateLimits();
