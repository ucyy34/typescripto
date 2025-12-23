/**
 * Auth Controller
 * Handle authentication HTTP requests
 */

const authService = require('../services/auth.service');
const { success, created } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    return created(res, result, 'Registration successful');
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await authService.login(req.body.email, req.body.password, ipAddress);

    return success(res, result, 'Login successful');
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refresh_token);

    return success(res, result, 'Token refreshed successfully');
  });

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    await authService.logout(req.user.id);

    return success(res, null, 'Logout successful');
  });

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    return success(res, user, 'Profile retrieved successfully');
  });

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);

    return success(res, user, 'Profile updated successfully');
  });

  /**
   * Change password
   * PUT /api/v1/auth/password
   */
  changePassword = asyncHandler(async (req, res) => {
    await authService.changePassword(req.user.id, req.body.current_password, req.body.new_password);

    return success(res, null, 'Password changed successfully');
  });

  /**
   * Verify email
   * GET /api/v1/auth/verify-email/:token
   */
  verifyEmail = asyncHandler(async (req, res) => {
    await authService.verifyEmail(req.params.token);

    return success(res, null, 'Email verified successfully');
  });

  /**
   * Forgot password
   * POST /api/v1/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);

    // Always return success to prevent email enumeration
    return success(res, null, 'Şifre sıfırlama linki e-posta adresinize gönderildi (test modunda konsola yazıldı)');
  });

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);

    return success(res, null, 'Şifreniz başarıyla değiştirildi');
  });
}

module.exports = new AuthController();
