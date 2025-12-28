/**
 * Auth Service
 * Business logic for authentication
 */

import { StatusCodes } from 'http-status-codes';
import crypto from 'crypto';
import { Op } from 'sequelize';

// Models (JS modules, so we use require or allow implicit any for now)
const { User } = require('../models');

// Utils
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { ApiError } = require('../middlewares/errorHandler');

// Domain Types
import { User as IUser } from '../types';

interface AuthResponse {
  user: IUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

class AuthService {
  /**
   * Register new user
   */
  async register(userData: Partial<IUser> & { password?: string }): Promise<AuthResponse> {
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
   */
  async login(email: string, password: string, ipAddress: string | null = null): Promise<AuthResponse> {
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
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
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
   */
  async logout(userId: string): Promise<void> {
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
   */
  async getProfile(userId: string): Promise<IUser> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    return user.toSafeObject();
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: Partial<IUser>): Promise<IUser> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError('User not found', StatusCodes.NOT_FOUND);
    }

    // Fields that can be updated
    const allowedFields = ['first_name', 'last_name', 'phone', 'avatar'];
    const filteredData: Record<string, unknown> = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        // @ts-ignore
        filteredData[key] = updateData[key as keyof IUser];
      }
    });

    await user.update(filteredData);

    return user.toSafeObject();
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
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
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await User.findOne({ where: { verification_token: token } });
    if (!user) {
      throw new ApiError('Invalid verification token', StatusCodes.BAD_REQUEST);
    }

    user.is_verified = true;
    user.verification_token = null;
    await user.save();
  }

  /**
   * Forgot password - create reset token
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists - just return silently
      console.log(`[FORGOT PASSWORD] Email not found: ${email}`);
      return;
    }

    // Generate reset token (random hex string)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to user
    user.reset_password_token = resetToken;
    user.reset_password_expires = resetExpires;
    await user.save();

    // For testing: Log reset link to console instead of sending email
    const resetUrl = `http://localhost:5500/pages/reset-password.html?token=${resetToken}`;
    console.log('');
    console.log('========================================');
    console.log('🔑 ŞİFRE SIFIRLAMA LİNKİ (TEST MODU)');
    console.log('========================================');
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 Link: ${resetUrl}`);
    console.log(`⏰ Geçerlilik: 1 saat`);
    console.log('========================================');
    console.log('');
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      throw new ApiError('Şifre sıfırlama linki geçersiz veya süresi dolmuş', StatusCodes.BAD_REQUEST);
    }

    // Update password
    user.password_hash = newPassword; // Will be hashed by hook
    user.reset_password_token = null;
    user.reset_password_expires = null;
    user.refresh_token = null; // Invalidate all sessions
    await user.save();

    console.log(`[RESET PASSWORD] Password reset successful for: ${user.email}`);
  }
}

// Export for CommonJS compatibility
export = new AuthService();
