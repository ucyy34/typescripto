/**
 * Fulfillment Smoke Tests (Phase 8.1)
 * 
 * Tests 26-31: Order status transitions, tracking, role-based auth
 */

const http = require('http');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3100';

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

async function runFulfillmentTests(sellerToken, buyerToken, orderId) {
    let passed = 0;
    let failed = 0;

    console.log('\n--- Phase 8.1: Fulfillment Tests ---');

    // Test 26: Status pending -> processing (seller)
    {
        console.log('\n👉 Test 26: pending → processing (seller)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'processing' }, sellerToken);

        if (res.status === 200 && res.body?.data?.newStatus === 'processing') {
            console.log(`   ✅ PASS (200, status: processing)`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: ${res.status} - ${JSON.stringify(res.body)?.substring(0, 100)}`);
            failed++;
        }
    }

    // Test 27: Add tracking (auto-shipped)
    {
        console.log('\n👉 Test 27: Add tracking → auto shipped...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/tracking`,
            { carrier: 'Yurtici Kargo', trackingNumber: 'YK123456789TR' }, sellerToken);

        if (res.status === 200 && res.body?.data?.status === 'shipped') {
            console.log(`   ✅ PASS (200, status: shipped, shippedAt: ${res.body?.data?.shippedAt})`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: ${res.status} - ${JSON.stringify(res.body)?.substring(0, 100)}`);
            failed++;
        }
    }

    // Test 28: Status shipped -> delivered
    {
        console.log('\n👉 Test 28: shipped → delivered...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'delivered' }, sellerToken);

        if (res.status === 200 && res.body?.data?.newStatus === 'delivered') {
            console.log(`   ✅ PASS (200, status: delivered, deliveredAt: ${res.body?.data?.deliveredAt})`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: ${res.status} - ${JSON.stringify(res.body)?.substring(0, 100)}`);
            failed++;
        }
    }

    // Test 29: Invalid transition delivered -> processing (422)
    {
        console.log('\n👉 Test 29: Invalid transition delivered → processing (422)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'processing' }, sellerToken);

        if (res.status === 422) {
            console.log(`   ✅ PASS (422 ValidationError: invalid transition)`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: Expected 422, got ${res.status}`);
            failed++;
        }
    }

    // Test 30: Buyer tries status update (403)
    {
        console.log('\n👉 Test 30: Buyer tries status update (403)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'processing' }, buyerToken);

        if (res.status === 403) {
            console.log(`   ✅ PASS (403 Forbidden: buyer blocked)`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: Expected 403, got ${res.status}`);
            failed++;
        }
    }

    // Test 31: Buyer tries tracking update (403)
    {
        console.log('\n👉 Test 31: Buyer tries tracking update (403)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/tracking`,
            { carrier: 'Hack Kargo', trackingNumber: 'HACK123' }, buyerToken);

        if (res.status === 403) {
            console.log(`   ✅ PASS (403 Forbidden: buyer blocked)`);
            passed++;
        } else {
            console.error(`   ❌ FAIL: Expected 403, got ${res.status}`);
            failed++;
        }
    }

    return { passed, failed };
}

module.exports = { runFulfillmentTests };

// Standalone execution
if (require.main === module) {
    console.log('Run from main smoke-test-ts.js with order context');
    process.exit(0);
}
