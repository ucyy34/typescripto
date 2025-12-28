/**
 * JWT Utilities
 * Token generation and verification with access + refresh token pattern
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const JWT_SECRET = env.JWT_SECRET || 'your_super_secret_jwt_key';
const JWT_EXPIRE = env.JWT_EXPIRE || '1h';
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_key';
const JWT_REFRESH_EXPIRE = env.JWT_REFRESH_EXPIRE || '7d';

interface TokenPayload {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
}

interface UserLike {
    id: string;
    email: string;
    role: string;
}

/**
 * Generate access token
 * @param {Object} payload - User data to encode
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRE,
        issuer: 'dostan-marketplace',
    });
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRE,
        issuer: 'dostan-marketplace',
    });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokens = (user: UserLike): { accessToken: string; refreshToken: string } => {
    const payload: TokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'dostan-marketplace',
        }) as TokenPayload;
    } catch (error: unknown) {
        const errorName = error instanceof Error ? error.name : '';
        if (errorName === 'TokenExpiredError') {
            throw new Error('Access token expired');
        }
        if (errorName === 'JsonWebTokenError') {
            throw new Error('Invalid access token');
        }
        throw error instanceof Error ? error : new Error(String(error));
    }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'dostan-marketplace',
        }) as TokenPayload;
    } catch (error: unknown) {
        const errorName = error instanceof Error ? error.name : '';
        if (errorName === 'TokenExpiredError') {
            throw new Error('Refresh token expired');
        }
        if (errorName === 'JsonWebTokenError') {
            throw new Error('Invalid refresh token');
        }
        throw error instanceof Error ? error : new Error(String(error));
    }
};

/**
 * Decode token without verification (useful for expired tokens)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token: string): TokenPayload | null => {
    try {
        return jwt.decode(token) as TokenPayload | null;
    } catch (error) {
        return null;
    }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
};

export {
    generateAccessToken,
    generateRefreshToken,
    generateTokens,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    extractTokenFromHeader,
};

// CommonJS compatibility
module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokens,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    extractTokenFromHeader,
};
