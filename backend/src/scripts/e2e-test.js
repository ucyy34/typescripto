/**
 * E2E API Test Script
 * Tests all major endpoints of the marketplace
 */

const http = require('http');
const https = require('https');

// Use 127.0.0.1 explicitly to avoid IPv6 issues
const BASE_URL = 'http://127.0.0.1:3002/api/v1';

let authToken = null;
let testResults = [];

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test helper
async function test(name, testFn) {
    try {
        const result = await testFn();
        if (result.success) {
            console.log(`✅ ${name}`);
            testResults.push({ name, status: 'PASS', details: result.details || '' });
        } else {
            console.log(`❌ ${name}: ${result.error}`);
            testResults.push({ name, status: 'FAIL', error: result.error });
        }
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        testResults.push({ name, status: 'ERROR', error: error.message });
    }
}

// =====================================================
// TESTS
// =====================================================

async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 E2E API Test Suite - Marketplace');
    console.log('='.repeat(60) + '\n');

    // 1. Health Check - use root endpoint
    await test('API Health Check', async () => {
        // Health check is at root /health, not /api/v1/health
        const url = new URL('http://127.0.0.1:3002/health');
        return new Promise((resolve) => {
            const req = require('http').request({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET' }, (res) => {
                resolve({ success: res.statusCode === 200, details: `Status: ${res.statusCode}` });
            });
            req.on('error', () => resolve({ success: false, error: 'Connection failed' }));
            req.end();
        });
    });

    // 2. Categories
    console.log('\n📂 CATEGORIES');
    console.log('-'.repeat(40));

    await test('Get All Categories', async () => {
        const res = await makeRequest('GET', '/categories');
        const count = res.data?.data?.length || 0;
        return { success: res.status === 200 && res.data?.success, details: `Found ${count} categories` };
    });

    await test('Get Featured Categories', async () => {
        const res = await makeRequest('GET', '/categories/featured');
        return { success: res.status === 200 && res.data?.success };
    });

    await test('Get Top Level Categories', async () => {
        const res = await makeRequest('GET', '/categories/top-level');
        return { success: res.status === 200 && res.data?.success };
    });

    // 3. Products
    console.log('\n🏺 PRODUCTS');
    console.log('-'.repeat(40));

    await test('Get All Products', async () => {
        const res = await makeRequest('GET', '/products');
        const count = res.data?.data?.length || 0;
        return { success: res.status === 200 && res.data?.success, details: `Found ${count} products` };
    });

    await test('Get Featured Products', async () => {
        const res = await makeRequest('GET', '/products/featured');
        return { success: res.status === 200 && res.data?.success };
    });

    await test('Search Products', async () => {
        const res = await makeRequest('GET', '/products?search=nordic');
        return { success: res.status === 200 && res.data?.success };
    });

    // 4. Stores
    console.log('\n🏪 STORES');
    console.log('-'.repeat(40));

    await test('Get All Stores', async () => {
        const res = await makeRequest('GET', '/stores');
        const count = res.data?.data?.length || 0;
        return { success: res.status === 200 && res.data?.success, details: `Found ${count} stores` };
    });

    await test('Get Featured Stores', async () => {
        const res = await makeRequest('GET', '/stores?is_featured=true');
        return { success: res.status === 200 && res.data?.success };
    });

    // 5. Authentication
    console.log('\n🔐 AUTHENTICATION');
    console.log('-'.repeat(40));

    await test('Login with Test Buyer', async () => {
        const res = await makeRequest('POST', '/auth/login', {
            email: 'anna.mueller@email.com',
            password: 'Buyer123!'
        });
        // Token is at data.tokens.accessToken
        const token = res.data?.data?.tokens?.accessToken;
        if (res.data?.success && token) {
            authToken = token;
            return { success: true, details: 'Token received' };
        }
        return { success: false, error: res.data?.message || 'Login failed - no token' };
    });

    await test('Get Current User Profile', async () => {
        if (!authToken) return { success: false, error: 'No auth token' };
        const res = await makeRequest('GET', '/auth/me', null, authToken);
        return { success: res.status === 200 && res.data?.success };
    });


    // 6. Cart (Authenticated)
    console.log('\n🛒 CART');
    console.log('-'.repeat(40));

    await test('Get Cart', async () => {
        if (!authToken) return { success: false, error: 'No auth token' };
        const res = await makeRequest('GET', '/cart', null, authToken);
        return { success: res.status === 200 && res.data?.success };
    });

    // 7. Addresses
    console.log('\n📍 ADDRESSES');
    console.log('-'.repeat(40));

    await test('Get User Addresses', async () => {
        if (!authToken) return { success: false, error: 'No auth token' };
        const res = await makeRequest('GET', '/addresses', null, authToken);
        // Empty array is also valid
        return { success: res.status === 200 };
    });

    // 8. Orders
    console.log('\n📦 ORDERS');
    console.log('-'.repeat(40));

    await test('Get User Orders', async () => {
        if (!authToken) return { success: false, error: 'No auth token' };
        const res = await makeRequest('GET', '/orders', null, authToken);
        return { success: res.status === 200 && res.data?.success };
    });

    // 9. Vendor Login
    console.log('\n🎨 VENDOR');
    console.log('-'.repeat(40));

    let vendorToken = null;
    await test('Login with Test Seller', async () => {
        const res = await makeRequest('POST', '/auth/login', {
            email: 'erik.nordstrom@nordic.com',
            password: 'Seller123!'
        });
        const token = res.data?.data?.tokens?.accessToken;
        if (res.data?.success && token) {
            vendorToken = token;
            return { success: true, details: 'Vendor token received' };
        }
        return { success: false, error: res.data?.message || 'Vendor login failed' };
    });

    let vendorStoreId = null;
    await test('Get Vendor Store', async () => {
        if (!vendorToken) return { success: false, error: 'No vendor token' };
        const res = await makeRequest('GET', '/stores/my-store', null, vendorToken);
        if (res.data?.success && res.data?.data?.id) {
            vendorStoreId = res.data.data.id;
        }
        return { success: res.status === 200 && res.data?.success };
    });

    await test('Get Vendor Products', async () => {
        if (!vendorToken || !vendorStoreId) return { success: false, error: 'No vendor token or store' };
        const res = await makeRequest('GET', `/stores/${vendorStoreId}/products`, null, vendorToken);
        return { success: res.status === 200 && res.data?.success };
    });

    await test('Get Vendor Orders', async () => {
        if (!vendorToken || !vendorStoreId) return { success: false, error: 'No vendor token or store' };
        const res = await makeRequest('GET', `/stores/${vendorStoreId}/orders`, null, vendorToken);
        return { success: res.status === 200 };
    });

    // 10. Admin Login
    console.log('\n👑 ADMIN');
    console.log('-'.repeat(40));

    let adminToken = null;
    await test('Login with Admin', async () => {
        const res = await makeRequest('POST', '/auth/login', {
            email: 'admin@dostanmarket.com',
            password: 'admin123'
        });
        const token = res.data?.data?.tokens?.accessToken;
        if (res.data?.success && token) {
            adminToken = token;
            return { success: true, details: 'Admin token received' };
        }
        return { success: false, error: res.data?.message || 'Admin login failed' };
    });

    await test('Get All Users (Admin)', async () => {
        if (!adminToken) return { success: false, error: 'No admin token' };
        const res = await makeRequest('GET', '/users', null, adminToken);
        return { success: res.status === 200 };
    });

    await test('Get All Orders (Admin)', async () => {
        if (!adminToken) return { success: false, error: 'No admin token' };
        const res = await makeRequest('GET', '/orders/admin', null, adminToken);
        return { success: res.status === 200 };
    });

    // 11. Category Variants (New feature)
    console.log('\n🎨 CATEGORY VARIANTS');
    console.log('-'.repeat(40));

    let testCategoryId = null;
    await test('Get Categories for Variant Test', async () => {
        const res = await makeRequest('GET', '/categories');
        if (res.data?.success && res.data?.data?.length > 0) {
            testCategoryId = res.data.data[0].id;
            return { success: true, details: `Using category: ${res.data.data[0].name}` };
        }
        return { success: false, error: 'No categories found' };
    });

    await test('Get Category Variants', async () => {
        if (!testCategoryId) return { success: false, error: 'No test category' };
        const res = await makeRequest('GET', `/categories/${testCategoryId}/variants`);
        const count = res.data?.data?.length || 0;
        return { success: res.status === 200 && res.data?.success, details: `Found ${count} variants` };
    });

    // 12. Coupons
    console.log('\n🎁 COUPONS');
    console.log('-'.repeat(40));

    await test('Get Coupons (Admin)', async () => {
        if (!adminToken) return { success: false, error: 'No admin token' };
        const res = await makeRequest('GET', '/coupons', null, adminToken);
        return { success: res.status === 200 };
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = testResults.filter(t => t.status === 'PASS').length;
    const failed = testResults.filter(t => t.status === 'FAIL').length;
    const errors = testResults.filter(t => t.status === 'ERROR').length;
    const total = testResults.length;

    console.log(`\n✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`⚠️  Errors: ${errors}/${total}`);
    console.log(`\n📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0 || errors > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.filter(t => t.status !== 'PASS').forEach(t => {
            console.log(`   - ${t.name}: ${t.error || t.status}`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

// Run
runTests().catch(console.error);
