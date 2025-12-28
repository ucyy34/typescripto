/**
 * Idempotency Test
 * Verifies that duplicate checkout requests return same orders without side effects
 * 
 * NOTE: We call orderService.createFromCart directly to test idempotency,
 * because the controller rejects empty carts before reaching idempotency check.
 */

const { sequelize, User, Store, Product, Category, Cart, CartItem, Order, StoreDailySales } = require('../models');

async function testIdempotency() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🚀 Starting Idempotency Test...');

        // 1. Setup Data
        const user = await User.create({
            email: `idem-test-${Date.now()}@test.com`,
            password_hash: 'hashed_secret',
            first_name: 'Idem',
            last_name: 'User'
        }, { transaction });

        const seller = await User.create({
            email: `idem-seller-${Date.now()}@test.com`,
            password_hash: 'hashed_secret',
            first_name: 'Seller',
            last_name: 'User'
        }, { transaction });

        const store = await Store.create({
            name: `IdemStore-${Date.now()}`,
            slug: `idem-store-${Date.now()}`,
            user_id: seller.id,
            status: 'approved',
            email: 'idem@test.com'
        }, { transaction });

        const category = await Category.create({
            name: 'Idem Cat',
            slug: `idem-cat-${Date.now()}`
        }, { transaction });

        const product = await Product.create({
            title: 'Idem Product',
            slug: `idem-p-${Date.now()}`,
            store_id: store.id,
            category_id: category.id,
            price: 100.00,
            stock: 50,
            status: 'approved',
            is_active: true,
            total_sales: 0
        }, { transaction });

        // 2. Create Cart
        const cart = await Cart.create({ user_id: user.id }, { transaction });
        await CartItem.create({
            cart_id: cart.id,
            product_id: product.id,
            quantity: 2,
            price_cents: 10000
        }, { transaction });

        await transaction.commit();
        console.log('✅ Setup complete.');

        // 3. Shared Idempotency Key
        const idempotencyKey = `IDEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Import orderService for direct testing
        const orderService = require('../services/order.service');

        // Build enriched cart for orderService
        const enrichedCart = {
            id: cart.id,
            items: [{
                product_id: product.id,
                quantity: 2,
                store_id: store.id,
                store: { id: store.id },
                variant: null,
                item_total: 200,
            }],
            totals: { subtotal: 200 },
        };

        const checkoutInput = {
            shipping_address: {
                full_name: 'Idem Buyer',
                phone: '1234567890',
                address_line1: 'Idem St',
                city: 'Istanbul',
                postal_code: '34000',
                country: 'TR'
            },
            payment_method: 'mock',
            idempotency_key: idempotencyKey,
        };

        // 4. First Request
        console.log('🔄 First Checkout Request...');
        const orders1 = await orderService.createFromCart(user.id, enrichedCart, checkoutInput);

        const orderIds1 = orders1.map((o: any) => o.id);
        console.log(`✅ First request created orders: ${orderIds1.join(', ')}`);

        // Get stock after first request
        const productAfter1 = await Product.findByPk(product.id);
        const stockAfter1 = productAfter1.stock;
        const salesAfter1 = productAfter1.total_sales;

        // Get siftah count
        const siftahAfter1 = await StoreDailySales.findOne({ where: { store_id: store.id } });
        const siftahCount1 = siftahAfter1?.successful_order_count || 0;

        console.log(`   Stock after 1st: ${stockAfter1}, Sales: ${salesAfter1}, Siftah: ${siftahCount1}`);

        // 5. Second Request (Duplicate - Same Idempotency Key)
        // Re-create enrichedCart with same data (cart was cleared)
        console.log('🔄 Second Checkout Request (Same Idempotency Key)...');

        const orders2 = await orderService.createFromCart(user.id, enrichedCart, checkoutInput);

        const orderIds2 = orders2.map((o: any) => o.id);
        console.log(`✅ Second request returned orders: ${orderIds2.join(', ')}`);

        // 6. Verify Idempotency

        // A. Same Order IDs
        const sameOrders = JSON.stringify(orderIds1.sort()) === JSON.stringify(orderIds2.sort());
        if (!sameOrders) {
            throw new Error(`❌ Idempotency Failed! Different orders returned.\nFirst: ${orderIds1}\nSecond: ${orderIds2}`);
        }
        console.log('✅ Check: Same order IDs returned.');

        // B. No Double Stock Decrement
        const productAfter2 = await Product.findByPk(product.id);
        if (productAfter2.stock !== stockAfter1) {
            throw new Error(`❌ Idempotency Failed! Stock changed.\nAfter 1st: ${stockAfter1}\nAfter 2nd: ${productAfter2.stock}`);
        }
        console.log('✅ Check: Stock not double-decremented.');

        // C. No Double Sales Increment
        if (productAfter2.total_sales !== salesAfter1) {
            throw new Error(`❌ Idempotency Failed! Sales changed.\nAfter 1st: ${salesAfter1}\nAfter 2nd: ${productAfter2.total_sales}`);
        }
        console.log('✅ Check: Total sales not double-incremented.');

        // D. No Double Siftah Recording
        const siftahAfter2 = await StoreDailySales.findOne({ where: { store_id: store.id } });
        const siftahCount2 = siftahAfter2?.successful_order_count || 0;
        if (siftahCount2 !== siftahCount1) {
            throw new Error(`❌ Idempotency Failed! Siftah count changed.\nAfter 1st: ${siftahCount1}\nAfter 2nd: ${siftahCount2}`);
        }
        console.log('✅ Check: Siftah not double-recorded.');

        console.log('🎉 IDEMPOTENCY TEST PASSED!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test Failed:', error);
        if (transaction && !transaction.finished) await transaction.rollback();
        process.exit(1);
    }
}

testIdempotency();
