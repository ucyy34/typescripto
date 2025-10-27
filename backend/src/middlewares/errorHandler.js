/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors = null) {
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
const notFound = (req, res, next) => {
  const error = new ApiError(`Route not found: ${req.originalUrl}`, StatusCodes.NOT_FOUND);
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, errors } = err;

  // Default to 500 if no status code is set
  statusCode = statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    message = 'Validation error';
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = StatusCodes.CONFLICT;
    message = 'Resource already exists';
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Referenced resource does not exist';
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
    errors = err.details.map((detail) => ({
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
  const response = {
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
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  notFound,
  errorHandler,
  asyncHandler,
};
