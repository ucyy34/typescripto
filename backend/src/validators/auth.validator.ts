/**
 * Auth Validation Schemas
 * Joi validation for authentication endpoints
 */

import Joi from 'joi';

/**
 * Register validation schema
 */
const registerSchema = Joi.object({
    email: Joi.string().email().required().trim().lowercase().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).max(100).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 100 characters',
        'any.required': 'Password is required',
    }),
    first_name: Joi.string().min(2).max(100).optional().trim(),
    last_name: Joi.string().min(2).max(100).optional().trim(),
    phone: Joi.string()
        .pattern(/^[+]?[0-9\s()-]+$/)
        .optional()
        .messages({
            'string.pattern.base': 'Please provide a valid phone number',
        }),
    role: Joi.string().valid('buyer', 'seller').default('buyer'),
});

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
    email: Joi.string().email().required().trim().lowercase().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required',
    }),
});

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = Joi.object({
    refresh_token: Joi.string().required().messages({
        'any.required': 'Refresh token is required',
    }),
});

/**
 * Email validation schema
 */
const emailSchema = Joi.object({
    email: Joi.string().email().required().trim().lowercase().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
});

/**
 * Reset password validation schema
 */
const resetPasswordSchema = Joi.object({
    token: Joi.string().required().messages({
        'any.required': 'Reset token is required',
    }),
    password: Joi.string().min(8).max(100).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 100 characters',
        'any.required': 'Password is required',
    }),
});

/**
 * Change password validation schema
 */
const changePasswordSchema = Joi.object({
    current_password: Joi.string().required().messages({
        'any.required': 'Current password is required',
    }),
    new_password: Joi.string().min(8).max(100).required().messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password cannot exceed 100 characters',
        'any.required': 'New password is required',
    }),
});

export {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    emailSchema,
    resetPasswordSchema,
    changePasswordSchema,
};

// CommonJS compatibility
module.exports = {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    emailSchema,
    resetPasswordSchema,
    changePasswordSchema,
};
