/**
 * Auth Controller
 * Handle authentication HTTP requests
 */

import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { success, created } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    return created(res, result, 'Registration successful');
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const ipAddress = authReq.ip || authReq.connection?.remoteAddress;
    const result = await authService.login(req.body.email, req.body.password, ipAddress);

    return success(res, result, 'Login successful');
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshToken(req.body.refresh_token);

    return success(res, result, 'Token refreshed successfully');
  });

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await authService.logout(authReq.user!.id);

    return success(res, null, 'Logout successful');
  });

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await authService.getProfile(authReq.user!.id);

    return success(res, user, 'Profile retrieved successfully');
  });

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await authService.updateProfile(authReq.user!.id, req.body);

    return success(res, user, 'Profile updated successfully');
  });

  /**
   * Change password
   * PUT /api/v1/auth/password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await authService.changePassword(authReq.user!.id, req.body.current_password, req.body.new_password);

    return success(res, null, 'Password changed successfully');
  });

  /**
   * Verify email
   * GET /api/v1/auth/verify-email/:token
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmail(req.params.token);

    return success(res, null, 'Email verified successfully');
  });

  /**
   * Forgot password
   * POST /api/v1/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);

    // Always return success to prevent email enumeration
    return success(res, null, 'Şifre sıfırlama linki e-posta adresinize gönderildi (test modunda konsola yazıldı)');
  });

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);

    return success(res, null, 'Şifreniz başarıyla değiştirildi');
  });
}

export = new AuthController();
