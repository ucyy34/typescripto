/**
 * Validation Middleware
 * Joi-based request validation
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Schema } from 'joi';

interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validate request body against Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validate = (schema: Schema): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all errors, not just the first one
            stripUnknown: true, // Remove unknown keys from request body
        });

        if (error) {
            const errors: ValidationError[] = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, ''), // Remove quotes from message
            }));

            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
                success: false,
                message: 'Validation failed',
                errors,
                timestamp: new Date().toISOString(),
            });
        }

        // Replace request body with validated and sanitized data
        req.body = value;
        next();
    };
};

/**
 * Validate request query parameters against Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema: Schema): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors: ValidationError[] = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, ''),
            }));

            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
                success: false,
                message: 'Validation failed',
                errors,
                timestamp: new Date().toISOString(),
            });
        }

        req.query = value;
        next();
    };
};

/**
 * Validate request params against Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema: Schema): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors: ValidationError[] = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, ''),
            }));

            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
                success: false,
                message: 'Validation failed',
                errors,
                timestamp: new Date().toISOString(),
            });
        }

        req.params = value;
        next();
    };
};

export {
    validate,
    validateQuery,
    validateParams,
};

// CommonJS compatibility
module.exports = {
    validate,
    validateQuery,
    validateParams,
};
