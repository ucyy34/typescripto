/**
 * Sequelize ORM Instance
 * Central database connection manager
 */

const { Sequelize } = require('sequelize');
const config = require('./database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
    dialectOptions: dbConfig.dialectOptions || {},
  }
);

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database: Connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database: Unable to connect:', error.message);
    return false;
  }
};

/**
 * Sync database models (use migrations in production)
 */
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ Database: Models synchronized');
    return true;
  } catch (error) {
    console.error('❌ Database: Sync failed:', error.message);
    return false;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database: Connection closed');
  } catch (error) {
    console.error('❌ Database: Error closing connection:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
};
