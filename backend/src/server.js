/**
 * Server Entry Point
 * Start Express server and initialize database connections
 */

require('dotenv').config();
const app = require('./app');
const { testConnection, syncDatabase } = require('./config/sequelize');
const { redisClient } = require('./config/redis');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Server instance
let server;

/**
 * Start server
 */
const startServer = async () => {
  try {
    console.log('🚀 Starting Dostan Marketplace Backend...\n');

    // Test database connection
    console.log('📊 Testing database connection...');
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
      console.log('📊 Synchronizing database models (dev boot)...');
      await syncDatabase({ alter: true });
    }

    // Test Redis connection
    console.log('🔴 Testing Redis connection...');
    await redisClient.ping();
    console.log('✅ Redis: Connection successful\n');

    // Start Express server
    server = app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🎉 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Press CTRL+C to stop the server\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('🔌 HTTP server closed');

      try {
        // Close database connection
        const { closeConnection } = require('./config/sequelize');
        await closeConnection();

        // Close Redis connection
        await redisClient.quit();
        console.log('🔴 Redis connection closed');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
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
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
