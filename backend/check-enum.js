const { Sequelize } = require('sequelize');
const config = require('./src/config/config.js')['development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: false
});

async function checkEnum() {
    try {
        const [results] = await sequelize.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'enum_orders_status';
    `);
        console.log('Current ENUM values:', results.map(r => r.enumlabel));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkEnum();
