/**
 * Phase 8.1 Fulfillment Test Runner (Standalone)
 * 
 * Creates fresh order and tests:
 * - Status transitions (pending → processing → shipped → delivered)
 * - Tracking update (auto-shipped)
 * - Invalid transitions (422)
 * - Role-based auth (buyer blocked 403)
 */

const http = require('http');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3100';
let SELLER_TOKEN = null;
let BUYER_TOKEN = null;
let ADMIN_TOKEN = null;

function request(method, url, body = null, token = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqHeaders = { 'Content-Type': 'application/json', ...headers };
        if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

        const req = http.request(parsedUrl, { method, headers: reqHeaders }, res => {
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

async function setup() {
    console.log('\n🔧 Setting up test credentials...');

    // Login as seller
    const sellerRes = await request('POST', `${BASE}/api/auth/login`, {
        email: 'seller@test.com',
        password: 'password123'
    });
    SELLER_TOKEN = sellerRes.body?.data?.tokens?.accessToken;
    console.log(`   Seller: ${SELLER_TOKEN ? '✅' : '❌'}`);

    // Login as buyer
    const buyerRes = await request('POST', `${BASE}/api/auth/login`, {
        email: 'buyer@test.com',
        password: 'password123'
    });
    BUYER_TOKEN = buyerRes.body?.data?.tokens?.accessToken;
    console.log(`   Buyer: ${BUYER_TOKEN ? '✅' : '❌'}`);

    // Login as admin
    const adminRes = await request('POST', `${BASE}/api/auth/login`, {
        email: 'admin@dostan.co',
        password: 'admin123'
    });
    ADMIN_TOKEN = adminRes.body?.data?.tokens?.accessToken;
    console.log(`   Admin: ${ADMIN_TOKEN ? '✅' : '❌'}`);

    return SELLER_TOKEN && ADMIN_TOKEN;
}

async function createTestOrder() {
    console.log('\n📦 Creating fresh test order...');

    // Get a product
    const prodRes = await request('GET', `${BASE}/api/v2/products?limit=1`);
    const product = prodRes.body?.data?.[0];
    if (!product) {
        console.error('   ❌ No products found');
        return null;
    }

    // Create order with admin (will be pending)
    const orderRes = await request('POST', `${BASE}/api/v2/orders`, {
        storeId: product.store_id || product.storeId,
        items: [{ productId: product.id, quantity: 1 }],
        shippingAddress: {
            fullName: 'Test User',
            phone: '+905551234567',
            addressLine1: 'Test Street 123',
            city: 'Istanbul',
            postalCode: '34000',
            country: 'TR'
        },
        paymentMethod: 'credit_card',
        idempotencyKey: `FULFILL-TEST-${Date.now()}`
    }, ADMIN_TOKEN);

    const orderId = orderRes.body?.data?.id || orderRes.body?.data?.orderId;
    const status = orderRes.body?.data?.status;
    console.log(`   Order: ${orderId ? orderId.substring(0, 8) + '...' : '❌'} (status: ${status})`);

    return { orderId, status };
}

async function runTests() {
    console.log('\n═══════════════════════════════════════════');
    console.log('   PHASE 8.1: FULFILLMENT SMOKE TESTS');
    console.log('═══════════════════════════════════════════');

    let passed = 0;
    let failed = 0;

    // Setup
    const ready = await setup();
    if (!ready) {
        console.error('\n❌ Setup failed - missing tokens');
        process.exit(1);
    }

    // Create test order
    const orderData = await createTestOrder();
    if (!orderData?.orderId) {
        console.error('\n❌ Failed to create test order');
        process.exit(1);
    }

    const { orderId } = orderData;

    console.log('\n--- Fulfillment Tests ---\n');

    // Test 26: pending → processing (admin)
    {
        console.log('👉 Test 26: pending → processing (admin)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'processing' }, ADMIN_TOKEN);

        if (res.status === 200 && res.body?.data?.newStatus === 'processing') {
            console.log(`   ✅ PASS (200, status: processing)`);
            passed++;
        } else {
            console.log(`   ❌ FAIL: ${res.status} - ${JSON.stringify(res.body).substring(0, 100)}`);
            failed++;
        }
    }

    // Test 27: Add tracking → auto shipped
    {
        console.log('\n👉 Test 27: Add tracking → auto shipped...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/tracking`,
            { carrier: 'Yurtici Kargo', trackingNumber: 'YK123456789TR' }, ADMIN_TOKEN);

        if (res.status === 200 && res.body?.data?.status === 'shipped') {
            console.log(`   ✅ PASS (200, status: shipped, shippedAt: ${res.body?.data?.shippedAt})`);
            passed++;
        } else {
            console.log(`   ❌ FAIL: ${res.status} - ${JSON.stringify(res.body).substring(0, 100)}`);
            failed++;
        }
    }

    // Test 28: shipped → delivered
    {
        console.log('\n👉 Test 28: shipped → delivered...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'delivered' }, ADMIN_TOKEN);

        if (res.status === 200 && res.body?.data?.newStatus === 'delivered') {
            console.log(`   ✅ PASS (200, status: delivered)`);
            passed++;
        } else {
            console.log(`   ❌ FAIL: ${res.status} - ${JSON.stringify(res.body).substring(0, 100)}`);
            failed++;
        }
    }

    // Test 29: Invalid transition delivered → processing (422)
    {
        console.log('\n👉 Test 29: Invalid transition delivered → processing (422)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'processing' }, ADMIN_TOKEN);

        if (res.status === 422) {
            console.log(`   ✅ PASS (422 ValidationError)`);
            passed++;
        } else {
            console.log(`   ❌ FAIL: Expected 422, got ${res.status}`);
            failed++;
        }
    }

    // Test 30: Buyer tries status update (403)
    if (BUYER_TOKEN) {
        console.log('\n👉 Test 30: Buyer tries status update (403)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/status/v2`,
            { status: 'processing' }, BUYER_TOKEN);

        if (res.status === 403) {
            console.log(`   ✅ PASS (403 Forbidden)`);
            passed++;
        } else {
            console.log(`   ❌ FAIL: Expected 403, got ${res.status}`);
            failed++;
        }
    } else {
        console.log('\n👉 Test 30: SKIP (no buyer token)');
    }

    // Test 31: Buyer tries tracking update (403)
    if (BUYER_TOKEN) {
        console.log('\n👉 Test 31: Buyer tries tracking update (403)...');
        const res = await request('PATCH', `${BASE}/api/v2/orders/${orderId}/tracking`,
            { carrier: 'Hack', trackingNumber: 'HACK123' }, BUYER_TOKEN);

        if (res.status === 403) {
            console.log(`   ✅ PASS (403 Forbidden)`);
            passed++;
        } else {
            console.log(`   ❌ FAIL: Expected 403, got ${res.status}`);
            failed++;
        }
    } else {
        console.log('\n👉 Test 31: SKIP (no buyer token)');
    }

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log(`🏆 FULFILLMENT TESTS: ${passed} Passed, ${failed} Failed`);
    console.log('═══════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
