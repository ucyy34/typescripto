/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';

interface ErrorDetails {
    field?: string;
    message: string;
}

interface ErrorResponse {
    success: boolean;
    message: string;
    timestamp: string;
    errors?: ErrorDetails[];
    stack?: string;
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    statusCode: number;
    errors: unknown;
    isOperational: boolean;

    constructor(message: string, statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR, errors: unknown = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true; // Distinguish operational errors from programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Not found error (404)
 */
const notFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = new ApiError(`Route not found: ${req.originalUrl}`, StatusCodes.NOT_FOUND);
    next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
    let { statusCode, message, errors } = err;

    // Handle AppError from new architecture (src/shared/errors)
    // Check for statusCode property which is set by all new error classes
    if (err.isOperational && typeof err.statusCode === 'number' && typeof err.code === 'string') {
        statusCode = err.statusCode;
        message = err.message;
        if (err.details) {
            errors = Array.isArray(err.details)
                ? err.details
                : [err.details];
        }
    }
    // Legacy: Handle old AppError (TypeScript Domain Logic from utils/AppError)
    else if (err.name === 'AppError' || (err.code && err.isOperational && err.name === 'AppError')) {
        try {
            // Map old AppError codes to HTTP Status
            switch (err.code) {
                case 'VALIDATION_ERROR':
                    statusCode = StatusCodes.BAD_REQUEST;
                    break;
                case 'AUTH_ERROR':
                    statusCode = StatusCodes.UNAUTHORIZED;
                    break;
                case 'STOCK_ERROR':
                    statusCode = StatusCodes.CONFLICT;
                    break;
                case 'ORDER_ERROR':
                    statusCode = StatusCodes.CONFLICT;
                    break;
                case 'NOT_FOUND':
                    statusCode = StatusCodes.NOT_FOUND;
                    break;
                default:
                    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
            }
            message = err.message;
            if (err.details) {
                errors = err.details;
            }
        } catch (e) {
            // Fallback if old AppError module not found
            statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
            message = err.message;
        }
    }

    // Default to 500 if no status code is set
    statusCode = statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

    // Handle Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
        statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
        message = 'Validation error';
        errors = err.errors.map((e: any) => ({
            field: e.path,
            message: e.message,
        }));
    }

    // Handle Sequelize unique constraint errors
    if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = StatusCodes.CONFLICT;
        message = 'Resource already exists';
        errors = err.errors.map((e: any) => ({
            field: e.path,
            message: e.message,
        }));
    }

    // Handle Sequelize foreign key constraint errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = StatusCodes.BAD_REQUEST;
        message = 'Referenced resource does not exist';

        // Log for debugging
        console.error('[Error Handler] Foreign key constraint error:', {
            table: err.table,
            field: err.fields,
            value: err.value,
            index: err.index,
            parent: err.parent
        });
    }

    // Handle Sequelize database connection errors
    if (err.name === 'SequelizeConnectionError') {
        statusCode = StatusCodes.SERVICE_UNAVAILABLE;
        message = 'Database connection error';
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = StatusCodes.UNAUTHORIZED;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = StatusCodes.UNAUTHORIZED;
        message = 'Token expired';
    }

    // Handle Joi validation errors
    if (err.name === 'ValidationError' && err.isJoi) {
        statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
        message = 'Validation error';
        errors = err.details.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message,
        }));
    }

    // Handle Multer errors (file upload)
    if (err.name === 'MulterError') {
        statusCode = StatusCodes.BAD_REQUEST;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File size too large';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = 'Too many files';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        } else {
            message = err.message;
        }
    }

    // Prepare response
    const response: ErrorResponse = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };

    // Add errors if present
    if (errors) {
        response.errors = errors;
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    logger.error('API error on %s %s -> %s', req.method, req.originalUrl, message, {
        statusCode,
        errors,
    });

    // Send response
    res.status(statusCode).json(response);
};

/**
 * Async error wrapper (catch async errors in route handlers)
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export {
    ApiError,
    notFound,
    errorHandler,
    asyncHandler,
};

// CommonJS compatibility
module.exports = {
    ApiError,
    notFound,
    errorHandler,
    asyncHandler,
};
