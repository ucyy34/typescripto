/**
 * Fulfillment V2 Smoke Tests (Simplified)
 * Tests status transitions, tracking updates via repository directly
 */

const { sequelize, User, Store, Product, Category, Order, OrderItem } = require('../models');
import { getOrderRepository } from '../infrastructure/repositories/SequelizeOrderRepository';
import { OrderStatus } from '../domain/types/order.types';

const orderRepo = getOrderRepository();

async function testFulfillmentV2() {
    const transaction = await sequelize.transaction();

    try {
        console.log('🚀 Starting Fulfillment V2 Smoke Tests...\n');

        // =====================
        // SETUP
        // =====================
        const buyer = await User.create({
            email: `buyer-${Date.now()}@test.com`,
            password_hash: 'hashed',
            first_name: 'Buyer',
            last_name: 'Test'
        }, { transaction });

        const seller = await User.create({
            email: `seller-${Date.now()}@test.com`,
            password_hash: 'hashed',
            first_name: 'Seller',
            last_name: 'Test',
            role: 'seller'
        }, { transaction });

        const store = await Store.create({
            name: `FulfillStore-${Date.now()}`,
            slug: `fulfill-store-${Date.now()}`,
            user_id: seller.id,
            status: 'approved',
            email: 'fulfill@test.com'
        }, { transaction });

        const category = await Category.create({
            name: 'Fulfill Cat',
            slug: `fulfill-cat-${Date.now()}`
        }, { transaction });

        const product = await Product.create({
            title: 'Fulfill Product',
            slug: `fulfill-p-${Date.now()}`,
            store_id: store.id,
            category_id: category.id,
            price: 100.00,
            stock: 100,
            status: 'approved',
            is_active: true
        }, { transaction });

        // Create test order
        const order = await Order.create({
            order_number: `ORD-${Date.now()}`,
            user_id: buyer.id,
            store_id: store.id,
            status: 'pending',
            payment_status: 'paid',
            payment_method: 'card',
            subtotal: 100.00,
            shipping_fee: 15.00,
            tax: 18.00,
            total: 133.00,
            shipping_address: { fullName: 'Test', city: 'Istanbul' }
        }, { transaction });

        await OrderItem.create({
            order_id: order.id,
            product_id: product.id,
            vendor_id: store.id,
            quantity: 1,
            price: 100.00,
            subtotal: 100.00,
            total: 100.00,
            unit_amount_cents: 10000,
            line_total_amount_cents: 10000,
            product_snapshot: { title: product.title }
        }, { transaction });

        await transaction.commit();
        console.log('✅ Setup complete: Order created with status "pending"\n');

        // =====================
        // TEST 1: Valid Status Transition (pending → processing)
        // =====================
        console.log('📋 Test 1: Repository updateStatus (pending → processing)');
        {
            const updated = await orderRepo.updateStatus(order.id, OrderStatus.PROCESSING);
            if (updated.status !== OrderStatus.PROCESSING) {
                throw new Error(`Test 1 Failed: Expected processing, got ${updated.status}`);
            }
            console.log('   ✅ PASSED: pending → processing\n');
        }

        // =====================
        // TEST 2: Valid Tracking Update (auto-shipped)
        // =====================
        console.log('📋 Test 2: Tracking Update (processing → shipped with tracking)');
        {
            const updated = await orderRepo.updateTracking(order.id, 'Yurtiçi Kargo', 'YK12345678');
            if (updated.status !== 'shipped') {
                throw new Error(`Test 2 Failed: Expected shipped, got ${updated.status}`);
            }
            if (updated.trackingNumber !== 'YK12345678') {
                throw new Error(`Test 2 Failed: Expected YK12345678, got ${updated.trackingNumber}`);
            }
            console.log('   ✅ PASSED: Tracking added, status auto-set to shipped\n');
        }

        // =====================
        // TEST 3: Valid Transition (shipped → delivered)
        // =====================
        console.log('📋 Test 3: Repository updateStatus (shipped → delivered)');
        {
            const updated = await orderRepo.updateStatus(order.id, OrderStatus.DELIVERED);
            if (updated.status !== OrderStatus.DELIVERED) {
                throw new Error(`Test 3 Failed: Expected delivered, got ${updated.status}`);
            }
            console.log('   ✅ PASSED: shipped → delivered\n');
        }

        // =====================
        // TEST 4: Verify timestamps
        // =====================
        console.log('📋 Test 4: Verify timestamps set correctly');
        {
            const finalOrder = await orderRepo.findById(order.id);
            if (!finalOrder) throw new Error('Order not found');

            // Check that we have timestamps set (shippedAt from tracking update)
            const raw = await Order.findByPk(order.id);
            if (!raw.shipped_at) {
                throw new Error('Test 4 Failed: shipped_at not set');
            }
            if (!raw.delivered_at) {
                throw new Error('Test 4 Failed: delivered_at not set');
            }
            console.log('   ✅ PASSED: Timestamps are set correctly\n');
        }

        // =====================
        // TEST 5: Second order for cancelled test
        // =====================
        console.log('📋 Test 5: Cancel transition (pending → cancelled)');
        {
            const order2 = await Order.create({
                order_number: `ORD2-${Date.now()}`,
                user_id: buyer.id,
                store_id: store.id,
                status: 'pending',
                payment_status: 'paid',
                payment_method: 'card',
                subtotal: 50.00,
                total: 50.00,
                shipping_address: { fullName: 'Test2', city: 'Ankara' }
            });

            const updated = await orderRepo.updateStatus(order2.id, OrderStatus.CANCELLED);
            if (updated.status !== OrderStatus.CANCELLED) {
                throw new Error(`Test 5 Failed: Expected cancelled, got ${updated.status}`);
            }

            const raw = await Order.findByPk(order2.id);
            if (!raw.cancelled_at) {
                throw new Error('Test 5 Failed: cancelled_at not set');
            }
            console.log('   ✅ PASSED: pending → cancelled with timestamp\n');
        }

        // =====================
        // SUMMARY
        // =====================
        console.log('═══════════════════════════════════════');
        console.log('🎉 ALL FULFILLMENT V2 TESTS PASSED!');
        console.log('═══════════════════════════════════════');
        console.log('✅ Test 1: Repository updateStatus (pending → processing)');
        console.log('✅ Test 2: Tracking update (auto-shipped)');
        console.log('✅ Test 3: Repository updateStatus (shipped → delivered)');
        console.log('✅ Test 4: Timestamps verification');
        console.log('✅ Test 5: Cancel transition with timestamp');
        console.log('═══════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Test Failed:', error);
        if (transaction && !transaction.finished) await transaction.rollback();
        process.exit(1);
    }
}

testFulfillmentV2();
