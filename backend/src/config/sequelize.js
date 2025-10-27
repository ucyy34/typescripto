/**
 * Sequelize ORM Instance
 * Central database connection manager
 */

const { Sequelize } = require('sequelize');
const config = require('./database');
const logger = require('../utils/logger');

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
    logger.info('✅ Connected to PostgreSQL');
    return true;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL: %s', error.message);
    return false;
  }
};

/**
 * Sync database models (use migrations in production)
 */
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    logger.info('✅ Database synced');
    return true;
  } catch (error) {
    logger.error('Database sync failed: %s', error.message);
    return false;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Database close failed: %s', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
};
