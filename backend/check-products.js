const { Product, sequelize } = require('./src/models');

async function check() {
    try {
        console.log('Database:', sequelize.config.database);
        console.log('Host:', sequelize.config.host);
        console.log('Port:', sequelize.config.port);

        const count = await Product.count();
        console.log('Product count:', count);
        const products = await Product.findAll({ limit: 5 });
        console.log('First 5 products:', JSON.stringify(products, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

check();
