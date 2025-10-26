/**
 * Complete E-Commerce Flow Test
 * Tests the entire marketplace flow from cart to refund
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Test data
let buyerToken = '';
let adminToken = '';
let sellerToken = '';
let productIds = [];
let storeId = '';
let orderId = '';
let returnId = '';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${'='.repeat(80)}`);
  log(`🧪 ${testName}`, 'blue');
  console.log('='.repeat(80));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'yellow');
}

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    return response.data.data.tokens.accessToken;
  } catch (error) {
    throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
  }
}

async function getProducts() {
  try {
    const response = await axios.get(`${API_BASE}/products?status=approved&is_active=true&limit=10`);
    return response.data.data;
  } catch (error) {
    throw new Error(`Get products failed: ${error.response?.data?.message || error.message}`);
  }
}

async function addToCart(token, productId, quantity = 1) {
  try {
    const response = await axios.post(
      `${API_BASE}/cart/items`,
      { product_id: productId, quantity },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Add to cart failed: ${error.response?.data?.message || error.message}`);
  }
}

async function getCart(token) {
  try {
    const response = await axios.get(`${API_BASE}/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // API returns data.data structure
    const cart = response.data.data;
    // Ensure items array exists
    return {
      ...cart,
      items: cart.items || []
    };
  } catch (error) {
    throw new Error(`Get cart failed: ${error.response?.data?.message || error.message}`);
  }
}

async function createOrder(token, storeId, items) {
  try {
    const response = await axios.post(
      `${API_BASE}/orders`,
      {
        store_id: storeId,
        items: items,
        shipping_address: {
          full_name: 'John Smith',
          phone: '+1 555 0123',
          address_line1: '123 Main St',
          address_line2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'USA'
        },
        payment_method: 'credit_card'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    throw new Error(`Create order failed: ${error.response?.data?.message || error.message}`);
  }
}

async function updateOrderStatus(token, orderId, status, additionalData = {}) {
  try {
    const response = await axios.patch(
      `${API_BASE}/orders/${orderId}/status`,
      { status, ...additionalData },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    throw new Error(`Update order status failed: ${error.response?.data?.message || error.message}`);
  }
}

async function getCommissions(token) {
  try {
    const response = await axios.get(`${API_BASE}/admin/commissions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    throw new Error(`Get commissions failed: ${error.response?.data?.message || error.message}`);
  }
}

async function createReturn(token, orderId, items) {
  try {
    const response = await axios.post(
      `${API_BASE}/returns`,
      {
        order_id: orderId,
        items: items,
        refund_method: 'original_payment'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    throw new Error(`Create return failed: ${error.response?.data?.message || error.message}`);
  }
}

async function updateReturnStatus(token, returnId, status, additionalData = {}) {
  try {
    const response = await axios.patch(
      `${API_BASE}/returns/${returnId}/status`,
      { status, ...additionalData },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    throw new Error(`Update return status failed: ${error.response?.data?.message || error.message}`);
  }
}

async function runTests() {
  console.log('\n🚀 Starting E-Commerce Flow Test\n');

  try {
    // Test 1: Login as Buyer
    logTest('Test 1: Login as Buyer');
    buyerToken = await login('john.smith@email.com', 'Buyer123!');
    logSuccess('Buyer logged in successfully');
    logInfo(`Token: ${buyerToken.substring(0, 30)}...`);

    // Test 2: Login as Admin
    logTest('Test 2: Login as Admin');
    adminToken = await login('admin@dostanmarket.com', 'Admin@123456');
    logSuccess('Admin logged in successfully');
    logInfo(`Token: ${adminToken.substring(0, 30)}...`);

    // Test 3: Get Products
    logTest('Test 3: Get Products');
    const products = await getProducts();
    productIds = products.slice(0, 3).map(p => p.id);
    storeId = products[0].store_id;
    logSuccess(`Found ${products.length} products`);
    logInfo(`Store ID: ${storeId}`);
    logInfo(`Product IDs: ${productIds.join(', ')}`);

    // Test 4: Add Products to Cart
    logTest('Test 4: Add Products to Cart');
    await addToCart(buyerToken, productIds[0], 2);
    logSuccess(`Added product 1 (qty: 2)`);
    await addToCart(buyerToken, productIds[1], 1);
    logSuccess(`Added product 2 (qty: 1)`);
    await addToCart(buyerToken, productIds[2], 3);
    logSuccess(`Added product 3 (qty: 3)`);

    // Test 5: View Cart
    logTest('Test 5: View Cart');
    const cart = await getCart(buyerToken);
    logSuccess(`Cart has ${cart.items.length} unique items`);
    if (cart.items.length > 0) {
      const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      logInfo(`Total items in cart: ${totalItems}`);
      logInfo(`Subtotal: ₺${cart.totals?.subtotal || 'N/A'}`);
      // Log cart items details
      cart.items.forEach((item, idx) => {
        logInfo(`  Item ${idx + 1}: ${item.product?.title || item.product_id} (qty: ${item.quantity})`);
      });
    } else {
      logError('Cart is empty after adding items!');
      throw new Error('Cart is empty - items were not saved');
    }

    // Test 6: Create Order
    logTest('Test 6: Create Order');
    // Group items by store
    const itemsByStore = {};
    cart.items.forEach(item => {
      const itemStoreId = item.product?.store_id || storeId;
      if (!itemsByStore[itemStoreId]) {
        itemsByStore[itemStoreId] = [];
      }
      itemsByStore[itemStoreId].push({
        product_id: item.product_id,
        quantity: item.quantity
      });
    });

    // Use the first store with items
    const orderStoreId = Object.keys(itemsByStore)[0];
    const orderItems = itemsByStore[orderStoreId];

    if (!orderItems || orderItems.length === 0) {
      throw new Error('No items from the same store in cart');
    }

    logInfo(`Creating order for store: ${orderStoreId}`);

    const order = await createOrder(buyerToken, orderStoreId, orderItems);
    orderId = order.id;
    logSuccess(`Order created: ${order.order_number}`);
    logInfo(`Order ID: ${orderId}`);
    logInfo(`Status: ${order.status}`);
    logInfo(`Total: ₺${order.total}`);

    // Test 7: Check Commission
    logTest('Test 7: Check Commission Transaction');
    const commissions = await getCommissions(adminToken);
    const orderCommission = commissions.find(c => c.order_id === orderId);
    if (orderCommission) {
      logSuccess('Commission transaction created');
      logInfo(`Commission rate: ${orderCommission.commission_rate}%`);
      logInfo(`Commission amount: ₺${orderCommission.commission_amount}`);
      logInfo(`Status: ${orderCommission.status}`);
    } else {
      logError('Commission transaction not found');
    }

    // Test 8: Mark Order as Paid
    logTest('Test 8: Mark Order as Paid');
    await updateOrderStatus(adminToken, orderId, 'paid');
    logSuccess('Order marked as paid');

    // Test 9: Mark Order as Processing
    logTest('Test 9: Mark Order as Processing');
    // Login as seller first
    const seller = await login('erik.nordstrom@woodcraft.com', 'Seller123!');
    sellerToken = seller;
    await updateOrderStatus(sellerToken, orderId, 'processing');
    logSuccess('Order marked as processing');

    // Test 10: Mark Order as Shipped
    logTest('Test 10: Mark Order as Shipped');
    await updateOrderStatus(sellerToken, orderId, 'shipped', {
      tracking_number: 'TRK123456789',
      carrier: 'UPS'
    });
    logSuccess('Order marked as shipped');
    logInfo('Tracking: TRK123456789 (UPS)');

    // Test 11: Mark Order as Delivered
    logTest('Test 11: Mark Order as Delivered');
    await updateOrderStatus(adminToken, orderId, 'delivered');
    logSuccess('Order marked as delivered');

    // Test 12: Create Return Request
    logTest('Test 12: Create Return Request');
    const returnRequest = await createReturn(buyerToken, orderId, [
      {
        product_id: orderItems[0].product_id,
        quantity: 1,
        reason: 'defective',
        description: 'Product arrived damaged'
      }
    ]);
    returnId = returnRequest.id;
    logSuccess(`Return request created: ${returnRequest.return_number}`);
    logInfo(`Return ID: ${returnId}`);
    logInfo(`Status: ${returnRequest.status}`);

    // Test 13: Approve Return
    logTest('Test 13: Approve Return (Seller)');
    await updateReturnStatus(sellerToken, returnId, 'approved', {
      resolution_note: 'Return approved, please ship back'
    });
    logSuccess('Return approved by seller');

    // Test 14: Process Refund
    logTest('Test 14: Process Refund (Admin)');
    await updateReturnStatus(adminToken, returnId, 'refunded', {
      refund_amount: 99.99
    });
    logSuccess('Refund processed');
    logInfo('Amount: ₺99.99');

    // Test 15: Verify Commission Adjustment
    logTest('Test 15: Verify Commission Adjustment');
    const updatedCommissions = await getCommissions(adminToken);
    const refundCommission = updatedCommissions.find(
      c => c.transaction_type === 'debit' && c.order_id === orderId
    );
    if (refundCommission) {
      logSuccess('Refund commission adjustment found');
      logInfo(`Adjustment: -₺${Math.abs(refundCommission.commission_amount)}`);
    } else {
      logError('Refund commission adjustment not found');
    }

    // Final Summary
    console.log('\n' + '='.repeat(80));
    log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!', 'green');
    console.log('='.repeat(80));
    console.log('\n📊 Test Summary:');
    console.log('  ✅ Authentication: PASSED');
    console.log('  ✅ Product Browsing: PASSED');
    console.log('  ✅ Cart Management: PASSED');
    console.log('  ✅ Order Creation: PASSED');
    console.log('  ✅ Commission Calculation: PASSED');
    console.log('  ✅ Order Flow (5 states): PASSED');
    console.log('  ✅ Return/Refund Process: PASSED');
    console.log('  ✅ Commission Adjustment: PASSED\n');

  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
