/**
 * Test Helper: Test App Factory
 * 
 * Creates Express app instances with standardized middleware for route testing
 */

const express = require('express');
const { notFound, errorHandler } = require('../../src/middlewares/errorHandler');

/**
 * Create a test Express app with routes and middleware
 * 
 * @param {object} options - Configuration options
 * @param {Array} options.routes - Array of [mountPath, router] tuples
 * @param {function} options.authMiddleware - Optional custom auth middleware
 * @param {boolean} options.includeNotFound - Include 404 handler (default: true)
 * @returns {Express.Application} Configured Express app
 * 
 * @example
 * const app = createTestApp({
 *   routes: [['/api/v1/users', userRoutes]],
 *   authMiddleware: mockAuthMiddleware(mockAdminUser())
 * });
 */
const createTestApp = ({
    routes = [],
    authMiddleware = null,
    includeNotFound = true,
} = {}) => {
    const app = express();

    // Body parsing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Optional auth middleware (applied globally if provided)
    if (authMiddleware) {
        app.use(authMiddleware);
    }

    // Mount routes
    routes.forEach(([mountPath, router]) => {
        app.use(mountPath, router);
    });

    // Error handling (same as production)
    if (includeNotFound) {
        app.use(notFound);
    }
    app.use(errorHandler);

    return app;
};

module.exports = {
    createTestApp,
};
