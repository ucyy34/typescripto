/**
 * Checkout V2 Smoke Tests (Phase 7.3)
 * 
 * Tests 26-29: Checkout init, confirm, idempotency, and stock error
 */

const http = require('http');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3100';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function request(method, url, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(parsedUrl, { method, headers }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runCheckoutTests(authToken, cartProductId) {
    let passed = 0;
    let failed = 0;

    console.log('\n--- Checkout V2 Tests (Phase 7.3) ---');

    // Test 26: Checkout init returns totals
    {
        console.log('\n👉 Test 26 (Checkout): POST /api/v2/checkout/init...');

        // Add item to cart first
        await request('POST', `${BASE}/api/v2/cart/items`, { productId: cartProductId, quantity: 2 }, authToken);

        const res = await request('POST', `${BASE}/api/v2/checkout/init`, {}, authToken);

        if (res.status === 200 && res.body?.totals?.total > 0) {
            console.log(`   ✅ PASS (totals.total: ${res.body.totals.total})`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: Status ${res.status}`);
            failed++;
        }
    }

    // Test 27: Checkout confirm creates order (201)
    let lastIdempotencyKey = null;
    let lastOrderNumber = null;
    {
        console.log('\n👉 Test 27 (Checkout): POST /api/v2/checkout/confirm (201)...');
        lastIdempotencyKey = `SMOKE-CHECKOUT-${Date.now()}-${generateUUID()}`;

        const res = await request('POST', `${BASE}/api/v2/checkout/confirm`, {
            idempotencyKey: lastIdempotencyKey,
            shippingAddress: {
                fullName: 'Test User',
                phone: '+905551234567',
                addressLine1: 'Test Street 123',
                city: 'Istanbul',
                postalCode: '34000',
                country: 'TR'
            },
            paymentMethod: 'mock'
        }, authToken);

        if (res.status === 201 && res.body?.data?.orderNumber) {
            console.log(`   ✅ PASS (201, orderNumber: ${res.body.data.orderNumber})`);
            passed++;
            lastOrderNumber = res.body.data.orderNumber;
        } else {
            console.error(`   ❌ FAIL: Expected 201, got ${res.status}`);
            failed++;
        }
    }

    // Test 28: Idempotency (200 on replay)
    {
        console.log('\n👉 Test 28 (Checkout): Idempotency (200)...');

        const res = await request('POST', `${BASE}/api/v2/checkout/confirm`, {
            idempotencyKey: lastIdempotencyKey,
            shippingAddress: {
                fullName: 'Test User',
                phone: '+905551234567',
                addressLine1: 'Test Street 123',
                city: 'Istanbul',
                postalCode: '34000',
                country: 'TR'
            },
            paymentMethod: 'mock'
        }, authToken);

        if (res.status === 200 && res.body?.data?.orderNumber === lastOrderNumber) {
            console.log(`   ✅ PASS (200, same orderNumber)`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: Expected 200. Got ${res.status}`);
            failed++;
        }
    }

    // Test 29: Stock error
    {
        console.log('\n👉 Test 29 (Checkout): Stock error...');

        // Add huge quantity
        await request('POST', `${BASE}/api/v2/cart/items`, { productId: cartProductId, quantity: 99999 }, authToken);

        const res = await request('POST', `${BASE}/api/v2/checkout/confirm`, {
            idempotencyKey: `SMOKE-STOCK-${Date.now()}-${generateUUID()}`,
            shippingAddress: {
                fullName: 'Test User',
                phone: '+905551234567',
                addressLine1: 'Test Street 123',
                city: 'Istanbul',
                postalCode: '34000',
                country: 'TR'
            },
            paymentMethod: 'mock'
        }, authToken);

        if (res.status === 422) {
            console.log(`   ✅ PASS (422 StockError)`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: Expected 422. Got ${res.status}`);
            failed++;
        }

        // Clear cart
        await request('DELETE', `${BASE}/api/v2/cart`, null, authToken);
    }

    return { passed, failed };
}

module.exports = { runCheckoutTests };
