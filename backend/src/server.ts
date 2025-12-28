/**
 * Server Entry Point
 * Start Express server and initialize database connections
 */

import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import app from './app';
// @ts-ignore
const { testConnection, syncDatabase, closeConnection } = require('./config/sequelize');
import logger from './utils/logger';
import './workers';

const PORT = parseInt(process.env.PORT || '8080', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Server instance
let server: http.Server;

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
            throw new Error('Failed to connect to PostgreSQL');
        }

        // Sync database schema (force: true will drop and recreate tables)
        if (NODE_ENV === 'development') {
            logger.info('Synchronizing database schema for development');
            const synced = await syncDatabase();

            if (!synced) {
                throw new Error('Failed to synchronize database schema');
            }
        }

        // Cache status (in-memory)
        logger.info('📦 Cache: Using in-memory storage');

        // Start Express server
        server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`, {
                environment: NODE_ENV,
                apiBaseUrl: `${BASE_URL}/api/v1`,
                healthCheck: `${BASE_URL}/health`,
            });
        });
    } catch (error: any) {
        logger.error('Failed to start server: %s', error.message);
        process.exit(1);
    }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal: string) => {
    logger.warn('%s received. Starting graceful shutdown…', signal);

    if (server) {
        server.close(async () => {
            logger.info('HTTP server closed');

            try {
                // Close database connection
                await closeConnection();

                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error: any) {
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
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception: %s', error && error.message ? error.message : error);
    logger.debug(error && error.stack ? error.stack : '');
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at promise %s', promise);
    logger.error('Reason: %s', reason && reason.message ? reason.message : reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
