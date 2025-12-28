/**
 * Rate Limiting Middleware
 * Protect API from abuse and DDoS attacks
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { OptionalAuthRequest } from '../domain/types/common.types';

// Allow disabling all rate limiting via env for local testing
const DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';
const passThrough: RequestHandler = (req: Request, res: Response, next: NextFunction): void => next();

/**
 * General API rate limiter
 * DEVELOPMENT: 1000 requests per 1 minute per IP (very relaxed for testing)
 */
const generalLimiterImpl = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || 1 * 60 * 1000, // 1 minute (was 15 minutes)
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10) || 1000, // 1000 requests (was 100)
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString(),
    },
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req: OptionalAuthRequest): boolean => {
        // Skip rate limiting for admin users
        const user = req.user;
        return !!(user && user.role === 'admin');
    },
});
const generalLimiter = DISABLED ? passThrough : generalLimiterImpl;

/**
 * Strict rate limiter for auth endpoints
 * 5 attempts per 15 minutes per IP
 */
const authLimiterImpl = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later',
        timestamp: new Date().toISOString(),
    },
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    skipSuccessfulRequests: true, // Don't count successful requests
});
const authLimiter = DISABLED ? passThrough : authLimiterImpl;

/**
 * Moderate rate limiter for registration
 * 3 registrations per hour per IP
 */
const registerLimiterImpl = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        message: 'Too many accounts created from this IP, please try again later',
        timestamp: new Date().toISOString(),
    },
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
});
const registerLimiter = DISABLED ? passThrough : registerLimiterImpl;

/**
 * Password reset rate limiter
 * 3 attempts per hour per IP
 */
const passwordResetLimiterImpl = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again later',
        timestamp: new Date().toISOString(),
    },
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
});
const passwordResetLimiter = DISABLED ? passThrough : passwordResetLimiterImpl;

/**
 * File upload rate limiter
 * 20 uploads per hour per IP
 */
const uploadLimiterImpl = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
        success: false,
        message: 'Too many file uploads, please try again later',
        timestamp: new Date().toISOString(),
    },
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
});
const uploadLimiter = DISABLED ? passThrough : uploadLimiterImpl;

/**
 * Search rate limiter
 * 30 searches per minute per IP
 */
const searchLimiterImpl = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: {
        success: false,
        message: 'Too many search requests, please slow down',
        timestamp: new Date().toISOString(),
    },
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
});
const searchLimiter = DISABLED ? passThrough : searchLimiterImpl;

/**
 * Tracking rate limiter
 * 20 tracking requests per 15 minutes per IP
 * Prevents brute-force tracking number enumeration
 */
const trackingRateLimiterImpl = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        success: false,
        message: 'Too many tracking requests. Please try again later.',
        timestamp: new Date().toISOString(),
    },
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
});
const trackingRateLimiter = DISABLED ? passThrough : trackingRateLimiterImpl;

export {
    generalLimiter,
    authLimiter,
    registerLimiter,
    passwordResetLimiter,
    uploadLimiter,
    searchLimiter,
    trackingRateLimiter,
};

// CommonJS compatibility
module.exports = {
    generalLimiter,
    authLimiter,
    registerLimiter,
    passwordResetLimiter,
    uploadLimiter,
    searchLimiter,
    trackingRateLimiter,
};
