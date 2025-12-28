/**
 * TypeScript Sandbox Bootstrap
 * Entry point for development ONLY.
 * 
 * Safety Guarantees:
 * 1. Checks strict env isolation (must be dev tag)
 * 2. Checks DB target (must not be prod)
 * 3. Starts server on isolated port 3100
 */

// Force process title for easier identification
process.title = 'railway-backend-ts-dev';

// Import required modules
// Restart Trigger: Final Check 3100
require('source-map-support').install();
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// 1. STRICT ENV LOADING
const envPath = path.resolve(__dirname, '../.env.ts');

if (!fs.existsSync(envPath)) {
    console.error(`\n❌ FATAL: .env.ts file missing at ${envPath}`);
    console.error('   You must create this file for TS development.');
    process.exit(1);
}

// Load .env.ts (forcing override to ensure no pollution from system env)
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

console.log('🔒 Secure Environment Loaded: .env.ts');

// 2. FAIL-FAST VALIDATIONS
const { ENV_TAG, DB_HOST, DB_NAME, PORT } = process.env;

// Check 2.1: ENV_TAG
if (ENV_TAG !== 'dev') {
    console.error(`\n❌ FATAL: ENV_TAG must be "dev". Found: "${ENV_TAG}"`);
    console.error('   Check your .env.ts file.');
    process.exit(1);
}

// Check 2.2: DB_HOST (Must exist)
if (!DB_HOST) {
    console.error(`\n❌ FATAL: DB_HOST is missing.`);
    console.error('   DB_HOST is required in .env.ts');
    process.exit(1);
}

// Check 2.3: DB_NAME (Must exist and end with _dev)
if (!DB_NAME) {
    console.error(`\n❌ FATAL: DB_NAME is missing.`);
    console.error('   DB_NAME is required in .env.ts');
    process.exit(1);
}

if (!DB_NAME.endsWith('_dev')) {
    console.error(`\n❌ FATAL: DB_NAME must end with "_dev". Found: "${DB_NAME}"`);
    console.error('   Safety enforcement: Typescript dev environment only allows databases ending in "_dev".');
    process.exit(1);
}

// Check 2.4: Port Isolation
if (PORT === '3002') {
    console.error(`\n❌ FATAL: PORT 3002 is reserved for Production (npm start).`);
    console.error('   Please use PORT=3100 or similar in .env.ts.');
    process.exit(1);
}

console.log('✅ Safety Checks Passed:');
console.log(`   - Mode: ${ENV_TAG}`);
console.log(`   - DB:   ${DB_HOST}/${DB_NAME}`);
console.log(`   - Port: ${PORT}`);

// 3. START SERVER
console.log('\n🚀 Bootstrapping App via TypeScript...\n');

try {
    // Debug Order Model
    const { Order } = require('./models');
    console.log('🔍 DEBUG: Order Status Values:', Order.rawAttributes.status.values);
    console.log('   Importing ./app module...');
    const app = require('./app');
    console.log('   Import success. App type:', typeof app);

    // Check if app is a function (Express app)
    if (typeof app !== 'function') {
        throw new Error('Exported app is not a function');
    }

    console.log(`   Attempting to listen on port ${PORT}...`);
    // Use app.listen directly instead of http.createServer
    const server = app.listen(PORT, '127.0.0.1', () => {
        console.log(`\n🛡️  TS Sandbox running on http://127.0.0.1:${PORT}`);
        console.log('   Ready for Smoke Tests!');
    });

    server.on('error', (err) => {
        console.error('❌ Server Listen Error:', err);
    });

} catch (error) {
    console.error('❌ Failed to bootstrap app:', error);
    console.error(error.stack);
    process.exit(1);
}
