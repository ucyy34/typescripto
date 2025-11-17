/**
 * Database Configuration (PostgreSQL + Sequelize)
 * Optimized for 50K daily traffic with connection pooling
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const logger = require('../utils/logger');

const parseDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);

    const username = decodeURIComponent(parsed.username || '');
    const password = decodeURIComponent(parsed.password || '');
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

    return {
      username,
      password,
      database,
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      sslRequired: parsed.searchParams.get('sslmode') === 'require',
    };
  } catch (error) {
    logger.warn('Invalid DATABASE_URL provided, falling back to discrete credentials: %s', error.message);
    return null;
  }
};

const withDatabaseUrl = (config, { enableSsl = false } = {}) => {
  const connection = parseDatabaseUrl(process.env.DATABASE_URL);

  if (!connection) {
    return config;
  }

  const dialectOptions = config.dialectOptions ? { ...config.dialectOptions } : undefined;
  const shouldUseSsl = enableSsl || connection.sslRequired;

  if (shouldUseSsl) {
    const sslOptions = { require: true, rejectUnauthorized: false };
    if (dialectOptions) {
      dialectOptions.ssl = { ...dialectOptions.ssl, ...sslOptions };
    } else {
      config = { ...config, dialectOptions: { ssl: sslOptions } };
    }
  }

  return {
    ...config,
    username: connection.username || config.username,
    password: connection.password || config.password,
    database: connection.database || config.database,
    host: connection.host || config.host,
    port: connection.port || config.port,
    dialectOptions: dialectOptions || config.dialectOptions,
  };
};

module.exports = {
  development: withDatabaseUrl({
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'dostan_marketplace_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg), // Route SQL logs through central logger
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
    define: {
      timestamps: true,
      underscored: true, // Use snake_case for column names
      paranoid: true, // Soft deletes (deleted_at column)
    },
  }),

  test: withDatabaseUrl({
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'dostan_marketplace_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false, // Disable SQL logging in tests
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
  }),

  production: withDatabaseUrl(
    {
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      dialect: 'postgres',
      logging: false, // Disable SQL logging in production
      pool: {
        max: parseInt(process.env.DB_POOL_MAX, 10) || 20, // Higher for production
        min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
        idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        paranoid: true,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // For cloud-hosted databases
        },
      },
    },
    { enableSsl: true }
  ),
};
