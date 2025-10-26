/**
 * Server Entry Point
 * Start Express server and initialize database connections
 */

require('dotenv').config();
const app = require('./app');
const { testConnection, syncDatabase } = require('./config/sequelize');
const { redisClient } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Server instance
let server;

/**
 * Start server
 */
const startServer = async () => {
  try {
    logger.info('Starting Dostan Marketplace backend');

    // Test database connection
    logger.info('Testing database connection');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Optional: sync database models in development for new tables (e.g., shipments)
    if (
      NODE_ENV === 'development' &&
      process.env.SHIPPING_PERSIST === 'true' &&
      process.env.SHIPPING_SYNC_ON_BOOT === 'true'
    ) {
      logger.warn('Synchronizing database models on boot (development override)');
      await syncDatabase({ alter: true });
    }

    // Test Redis connection
    logger.info('Testing Redis connection');
    await redisClient.ping();
    logger.info('Redis connection successful');

    // Start Express server
    server = app.listen(PORT, () => {
      logger.info('Server running', {
        port: PORT,
        environment: NODE_ENV,
        apiBaseUrl: `http://localhost:${PORT}/api/v1`,
        healthCheck: `http://localhost:${PORT}/health`,
      });
    });
  } catch (error) {
    logger.error('Failed to start server: %s', error.message);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  logger.warn('%s received. Starting graceful shutdown…', signal);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connection
        const { closeConnection } = require('./config/sequelize');
        await closeConnection();

        // Close Redis connection
        await redisClient.quit();
        logger.info('Redis connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown: %s', error.message);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle process termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception: %s', error && error.message ? error.message : error);
  logger.debug(error && error.stack ? error.stack : '');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at promise %s', promise);
  logger.error('Reason: %s', reason && reason.message ? reason.message : reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
