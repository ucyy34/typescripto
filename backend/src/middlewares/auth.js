/**
 * Authentication Middleware
 * JWT-based authentication with role-based access control (RBAC)
 */

const { StatusCodes } = require('http-status-codes');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const { ApiError, asyncHandler } = require('./errorHandler');
const { User, Store } = require('../models');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return unauthorized(res, 'No token provided');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Find user
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return unauthorized(res, 'User not found');
    }

    if (!user.is_active) {
      return forbidden(res, 'Account is inactive');
    }

    // Attach user to request
    req.user = user.toSafeObject();
    next();
  } catch (error) {
    return unauthorized(res, error.message);
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findByPk(decoded.id);

      if (user && user.is_active) {
        req.user = user.toSafeObject();
      }
    }

    next();
  } catch (error) {
    // Silently fail, continue without user
    next();
  }
};

/**
 * Require specific role(s)
 * @param  {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied. Required role: ${roles.join(' or ')}`);
    }

    next();
  };
};

/**
 * Require admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Require seller role
 */
const requireSeller = requireRole('seller', 'admin');

/**
 * Require buyer role (or any authenticated user)
 */
const requireBuyer = requireRole('buyer', 'seller', 'admin');

/**
 * Require seller or admin role
 */
const requireSellerOrAdmin = requireRole('seller', 'admin');

/**
 * Check if user owns the resource
 * @param {Function} getResourceUserId - Function to extract user_id from request
 */
const requireOwnership = (getResourceUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    const resourceUserId = getResourceUserId(req);

    // Admins can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership
    if (req.user.id !== resourceUserId) {
      return forbidden(res, 'You do not have permission to access this resource');
    }

    next();
  };
};

/**
 * Validate Store Ownership
 * Ensures the authenticated user owns the store they're trying to access
 * Admins bypass this check
 */
const validateStoreOwnership = asyncHandler(async (req, res, next) => {
  const storeId = req.params.storeId;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    throw new ApiError('Authentication required', StatusCodes.UNAUTHORIZED);
  }

  if (userRole === 'admin') {
    return next();
  }

  const store = await Store.findOne({
    where: {
      id: storeId,
      user_id: userId,
    },
  });

  if (!store) {
    throw new ApiError(
      'You do not have permission to access this store',
      StatusCodes.FORBIDDEN
    );
  }

  req.store = store;
  return next();
});

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSeller,
  requireSellerOrAdmin,
  requireBuyer,
  requireOwnership,
  validateStoreOwnership,
};
