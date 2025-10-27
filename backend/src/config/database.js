/**
 * Database Configuration (PostgreSQL + Sequelize)
 * Optimized for 50K daily traffic with connection pooling
 */

require('dotenv').config();
const logger = require('../utils/logger');

const useDatabaseUrl = Boolean(process.env.DATABASE_URL);
const shouldUseSsl = process.env.DATABASE_SSL === 'true';

const sslOptions = shouldUseSsl
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
  : undefined;

const buildConfig = ({
  logging,
  database,
  username,
  password,
  host,
  port,
  pool,
  define,
}) => {
  const base = {
    dialect: 'postgres',
    logging,
    pool,
    define,
  };

  if (useDatabaseUrl) {
    return {
      ...base,
      use_env_variable: 'DATABASE_URL',
      dialectOptions: sslOptions,
    };
  }

  return {
    ...base,
    database,
    username,
    password,
    host,
    port,
    dialectOptions: sslOptions,
  };
};

module.exports = {
  development: buildConfig({
    logging: (msg) => logger.debug(msg),
    database: process.env.DB_NAME || 'dostan_marketplace_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
  }),

  test: buildConfig({
    logging: false,
    database: process.env.DB_NAME || 'dostan_marketplace_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
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

  production: buildConfig({
    logging: false,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
  }),
};
