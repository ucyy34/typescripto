/**
 * Database Configuration (PostgreSQL + Sequelize)
 * Optimized for 50K daily traffic with connection pooling
 */

require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'dostan_marketplace_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: console.log, // Enable SQL logging in development
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
  },

  test: {
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
  },

  production: {
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
};
