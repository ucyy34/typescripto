/**
 * Check product status in database
 */
const { Product, Store } = require('./backend/src/models');

async function checkProducts() {
    try {
        console.log('=== CHECKING PRODUCTS ===\n');
        
        // Get all products
        const products = await Product.findAll({
            attributes: ['id', 'title', 'status', 'is_active', 'stock'],
            include: [
                { 
                    model: Store, 
                    as: 'store', 
                    attributes: ['id', 'name', 'status'] 
                }
            ],
            limit: 10,
            order: [['created_at', 'DESC']]
        });

        console.log(`Found ${products.length} products:\n`);

        products.forEach((p, i) => {
            console.log(`${i + 1}. ${p.title}`);
            console.log(`   ID: ${p.id}`);
            console.log(`   Status: ${p.status}`);
            console.log(`   Active: ${p.is_active}`);
            console.log(`   Stock: ${p.stock}`);
            console.log(`   Store: ${p.store?.name} (status: ${p.store?.status})`);
            console.log('');
        });

        // Count by status
        const statusCounts = await Product.findAll({
            attributes: [
                'status',
                [Product.sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['status']
        });

        console.log('=== STATUS SUMMARY ===');
        statusCounts.forEach(s => {
            console.log(`${s.status}: ${s.get('count')} products`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProducts();
