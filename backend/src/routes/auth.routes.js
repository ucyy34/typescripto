/**
 * Auth Routes
 * Authentication endpoints
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { authLimiter, registerLimiter } = require('../middlewares/rateLimiter');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   PUT /api/v1/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', authenticate, validate(changePasswordSchema), authController.changePassword);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
