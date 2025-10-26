/**
 * Clear Redis Cache - Debug Script
 * Clears all category cache to force reload from database
 */

require('dotenv').config();
const { cache } = require('../config/redis');

async function clearCache() {
  try {
    console.log('\n🧹 Clearing Redis Cache...\n');

    // Clear all category-related cache
    await cache.delPattern('categories:*');

    console.log('✅ Category cache cleared!\n');
    console.log('The API will now fetch fresh data from the database.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

clearCache();
