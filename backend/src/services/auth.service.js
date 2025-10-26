/**
 * Auth Service
 * Business logic for authentication
 */

const { User } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');

class AuthService {
  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and tokens
   */
  async register(userData) {
    // Check if user already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      throw new ApiError('User with this email already exists', StatusCodes.CONFLICT);
    }

    // Create user (password will be hashed by User model hook)
    const user = await User.create({
      ...userData,
      password_hash: userData.password, // Will be hashed automatically
    });

    // Generate tokens
    const tokens = generateTokens(user);

    // Save refresh token to database
    user.refresh_token = tokens.refreshToken;
    await user.save();

    return {
      user: user.toSafeObject(),
      tokens,
    };
  }

  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} User and tokens
   */
  async login(email, password, ipAddress = null) {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new ApiError('Invalid email or password', StatusCodes.UNAUTHORIZED);
    }

    // Check if account is active
    if (!user.is_active) {
      throw new ApiError('Account is inactive. Please contact support.', StatusCodes.FORBIDDEN);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError('Invalid email or password', StatusCodes.UNAUTHORIZED);
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Update user login info
    user.refresh_token = tokens.refreshToken;
    user.last_login_at = new Date();
    if (ipAddress) {
      user.last_login_ip = ipAddress;
    }
    await user.save();

    return {
      user: user.toSafeObject(),
      tokens,
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(refreshToken) {
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new ApiError('Invalid or expired refresh token', StatusCodes.UNAUTHORIZED);
    }

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.UNAUTHORIZED);
    }

    // Check if refresh token matches the one in database
    if (user.refresh_token !== refreshToken) {
      throw new ApiError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }

    // Check if user is active
    if (!user.is_active) {
      throw new ApiError('Account is inactive', StatusCodes.FORBIDDEN);
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token in database
    user.refresh_token = tokens.refreshToken;
    await user.save();

    return {
      user: user.toSafeObject(),
      tokens,
    };
  }

  /**
   * Logout user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async logout(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    // Clear refresh token
    user.refresh_token = null;
    await user.save();
  }

  /**
   * Get current user profile
   * @param {string} userId
   * @returns {Promise<Object>} User profile
   */
  async getProfile(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    return user.toSafeObject();
  }

  /**
   * Update user profile
   * @param {string} userId
   * @param {Object} updateData
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    // Fields that can be updated
    const allowedFields = ['first_name', 'last_name', 'phone', 'avatar'];
    const filteredData = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    await user.update(filteredData);

    return user.toSafeObject();
  }

  /**
   * Change password
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new ApiError('Current password is incorrect', StatusCodes.UNAUTHORIZED);
    }

    // Update password
    user.password_hash = newPassword; // Will be hashed by hook
    user.refresh_token = null; // Invalidate all sessions
    await user.save();
  }

  /**
   * Verify email (placeholder for email verification flow)
   * @param {string} token
   * @returns {Promise<void>}
   */
  async verifyEmail(token) {
    const user = await User.findOne({ where: { verification_token: token } });
    if (!user) {
      throw new ApiError('Invalid verification token', StatusCodes.BAD_REQUEST);
    }

    user.is_verified = true;
    user.verification_token = null;
    await user.save();
  }
}

module.exports = new AuthService();
