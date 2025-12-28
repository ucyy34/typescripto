/**
 * Test Helper: Auth Mocking Utilities
 * 
 * Provides consistent authentication mocking across all route tests
 */

/**
 * Create a mock authenticated user object
 * @param {object} overrides - Custom user properties
 * @returns {object} User object
 */
const mockAdminUser = (overrides = {}) => ({
    id: 'admin-test-id-001',
    email: 'admin@test.com',
    role: 'admin',
    first_name: 'Test',
    last_name: 'Admin',
    is_active: true,
    ...overrides,
});

const mockBuyerUser = (overrides = {}) => ({
    id: 'buyer-test-id-001',
    email: 'buyer@test.com',
    role: 'buyer',
    first_name: 'Test',
    last_name: 'Buyer',
    is_active: true,
    ...overrides,
});

const mockSellerUser = (overrides = {}) => ({
    id: 'seller-test-id-001',
    email: 'seller@test.com',
    role: 'seller',
    first_name: 'Test',
    last_name: 'Seller',
    is_active: true,
    store_id: 'store-test-id-001',
    ...overrides,
});

/**
 * Create a mock auth middleware that sets req.user
 * @param {object} user - User object to attach
 * @returns {function} Express middleware
 */
const mockAuthMiddleware = (user = null) => {
    const userToAttach = user || mockAdminUser();
    return (req, res, next) => {
        req.user = userToAttach;
        next();
    };
};

/**
 * Mock admin auth (for Jest mock)
 * @returns {object} Middleware mock object
 */
const mockAdminAuth = () => ({
    authenticate: mockAuthMiddleware(mockAdminUser()),
    requireAdmin: (req, res, next) => next(),
    requireSeller: (req, res, next) => next(),
});

module.exports = {
    mockAuthMiddleware,
    mockAdminUser,
    mockBuyerUser,
    mockSellerUser,
    mockAdminAuth,
};
