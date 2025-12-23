
require('dotenv').config();
const { sequelize, User, Store, Product, Order } = require('../models');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const hashedPassword = await bcrypt.hash('Test@123456', 12);

        // 1. Create/Update Vendor
        const [vendorUser] = await User.findOrCreate({
            where: { email: 'vendor@test.com' },
            defaults: {
                first_name: 'Test',
                last_name: 'Vendor',
                password_hash: hashedPassword,
                role: 'seller',
                is_active: true,
                email_verified: true
            }
        });
        console.log('Vendor user ready:', vendorUser.id);

        // 2. Create/Update Store for Vendor
        const [store] = await Store.findOrCreate({
            where: { user_id: vendorUser.id },
            defaults: {
                name: 'Test Store',
                slug: 'test-store',
                description: 'Test Store Description',
                shipping_cost: 50.00
            }
        });
        console.log('Store ready:', store.id);

        // 3. Ensure Store has a Product
        const [product] = await Product.findOrCreate({
            where: { store_id: store.id },
            defaults: {
                name: 'Test Product',
                slug: 'test-product',
                description: 'Test Product Description',
                price: 100.00,
                stock: 100,
                status: 'approved',
                images: []
            }
        });
        console.log('Product ready:', product.id);

        // 4. Create/Update Buyer (New Customer - No Orders)
        const [buyerUser] = await User.findOrCreate({
            where: { email: 'buyer@test.com' },
            defaults: {
                first_name: 'Test',
                last_name: 'Buyer',
                password_hash: hashedPassword,
                role: 'buyer',
                is_active: true,
                email_verified: true
            }
        });

        // Update password in case it exists
        await buyerUser.update({ password_hash: hashedPassword });

        // DELETE existing orders to ensure "First Order" logic
        await Order.destroy({ where: { user_id: buyerUser.id } });
        console.log('Buyer user ready (Orders cleared):', buyerUser.id);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestUsers();
