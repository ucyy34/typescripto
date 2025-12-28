/**
 * Reset Test Data Script
 * 
 * Restores product stock to safe threshold for smoke tests.
 * Does NOT touch other data (users, stores, categories, etc).
 * 
 * SAFETY: Fails fast if not running against dev/test database.
 * 
 * Usage: npm run smoke:reset
 */

const MIN_STOCK = 100;
const SMOKE_ORDER_PREFIX = 'SMOKE-';

// ============================================
// ENVIRONMENT GUARDS (FAIL-FAST)
// ============================================

function validateEnvironment() {
    const errors = [];

    // 1. Check ENV_TAG or SMOKE_TEST_MODE
    const envTag = process.env.ENV_TAG || '';
    const smokeMode = process.env.SMOKE_TEST_MODE === 'true';
    if (envTag !== 'dev' && envTag !== 'test' && !smokeMode) {
        errors.push(`ENV_TAG must be 'dev' or 'test', or set SMOKE_TEST_MODE=true (got: '${envTag}')`);
    }

    // 2. Block production NODE_ENV
    if (process.env.NODE_ENV === 'production') {
        errors.push('NODE_ENV=production detected. BLOCKED.');
    }

    // 3. Check DB_NAME ends with _dev or _test
    const dbName = process.env.DB_NAME || process.env.POSTGRES_DB || '';
    if (!dbName.endsWith('_dev') && !dbName.endsWith('_test')) {
        errors.push(`DB_NAME must end with '_dev' or '_test' (got: '${dbName}')`);
    }

    // 4. Block production-like hostnames
    const dbHost = (process.env.DB_HOST || process.env.POSTGRES_HOST || '').toLowerCase();
    const prodPatterns = ['prod', 'aws', 'amazon', 'azure', 'rds', 'heroku', 'supabase', 'neon', 'planetscale'];
    for (const pattern of prodPatterns) {
        if (dbHost.includes(pattern)) {
            errors.push(`DB_HOST looks like production (contains '${pattern}'): ${dbHost}`);
            break;
        }
    }

    // If any errors, fail fast
    if (errors.length > 0) {
        console.error('\n❌ FATAL: Environment validation failed!\n');
        errors.forEach((e, i) => console.error(`   ${i + 1}. ${e}`));
        console.error('\n   Set ENV_TAG=dev or SMOKE_TEST_MODE=true to run tests.\n');
        process.exit(1);
    }

    console.log('✅ Environment validated: Safe to run tests');
}

// ============================================
// DATABASE RESET FUNCTIONS
// ============================================

async function resetProductStock() {
    // Use Sequelize from existing config (path from scripts folder)
    const { sequelize } = require('../config/sequelize');

    try {
        // Reset all products with low stock
        const [results] = await sequelize.query(`
      UPDATE products 
      SET stock = ${MIN_STOCK} 
      WHERE stock < ${MIN_STOCK}
      RETURNING id, title, stock
    `);

        console.log(`✅ Reset stock for ${results.length} products to ${MIN_STOCK}`);

        if (results.length > 0 && results.length <= 5) {
            results.forEach(p => console.log(`   - ${p.title}: stock → ${MIN_STOCK}`));
        }

        return results.length;
    } catch (error) {
        console.error('❌ Failed to reset product stock:', error.message);
        throw error;
    }
}

async function cleanupSmokeOrders() {
    const { sequelize } = require('../config/sequelize');

    try {
        // Delete smoke test orders (optional - keeps DB clean)
        const [results] = await sequelize.query(`
      DELETE FROM order_items 
      WHERE order_id IN (
        SELECT id FROM orders WHERE order_number LIKE '${SMOKE_ORDER_PREFIX}%'
      )
    `);

        const [orderResults] = await sequelize.query(`
      DELETE FROM orders 
      WHERE order_number LIKE '${SMOKE_ORDER_PREFIX}%'
      RETURNING id, order_number
    `);

        if (orderResults.length > 0) {
            console.log(`✅ Cleaned up ${orderResults.length} smoke test orders`);
        } else {
            console.log(`✅ No smoke test orders to clean up`);
        }

        return orderResults.length;
    } catch (error) {
        // Non-fatal - orders may not have SMOKE- prefix yet
        console.log(`⚠️  Smoke order cleanup skipped: ${error.message}`);
        return 0;
    }
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('\n🧹 SMOKE TEST DATA RESET\n');
    console.log('─'.repeat(40));

    // 1. Validate environment
    validateEnvironment();

    // 2. Reset product stock
    await resetProductStock();

    // 3. Cleanup old smoke orders (optional)
    // await cleanupSmokeOrders();

    // 4. Cleanup Guest Carts (Required for deterministic Guest/Merge tests)
    await cleanupSmokeCarts();

    console.log('─'.repeat(40));
    console.log('✅ Reset complete. Ready for smoke tests.\n');

    process.exit(0);
}

async function cleanupSmokeCarts() {
    const { sequelize } = require('../config/sequelize');
    try {
        // Delete items of smoke guest carts
        await sequelize.query(`
            DELETE FROM cart_items 
            WHERE cart_id IN (
                SELECT id FROM carts WHERE guest_key LIKE '${SMOKE_ORDER_PREFIX}%'
            )
        `);

        // Delete smoke guest carts
        const [results] = await sequelize.query(`
            DELETE FROM carts 
            WHERE guest_key LIKE '${SMOKE_ORDER_PREFIX}%'
            RETURNING id
        `);

        if (results.length > 0) {
            console.log(`✅ Cleaned up ${results.length} smoke guest carts`);
        }
    } catch (error) {
        console.log(`⚠️  Guest cart cleanup skipped: ${error.message}`);
    }
}

main().catch(err => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
});
