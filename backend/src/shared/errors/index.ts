/**
 * Centralized Error Handling
 * SINGLE SOURCE OF TRUTH for all application errors
 * 
 * Usage:
 *   import { NotFoundError, ValidationError } from '@/shared/errors';
 *   throw new NotFoundError('Order', orderId);
 */

/**
 * Error codes for consistent API responses
 */
export enum ErrorCode {
    // Client errors (4xx)
    VALIDATION = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    CONFLICT = 'CONFLICT',
    RATE_LIMITED = 'RATE_LIMITED',

    // Business logic errors
    BUSINESS_RULE = 'BUSINESS_RULE_VIOLATION',
    STOCK_ERROR = 'STOCK_ERROR',
    ORDER_ERROR = 'ORDER_ERROR',
    PAYMENT_ERROR = 'PAYMENT_ERROR',

    // Server errors (5xx)
    INTERNAL = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Base application error class
 * All custom errors extend this
 */
export class AppError extends Error {
    public readonly isOperational: boolean = true;

    constructor(
        public readonly message: string,
        public readonly code: ErrorCode,
        public readonly statusCode: number,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Serialize error for API response
     */
    toJSON() {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && { details: this.details }),
            },
        };
    }
}

// ============================================
// 4xx Client Errors
// ============================================

/**
 * 400 - Validation Error
 * Use when request data fails validation
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, ErrorCode.VALIDATION, 400, details);
    }
}

/**
 * 401 - Unauthorized
 * Use when authentication is required but missing/invalid
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, ErrorCode.UNAUTHORIZED, 401);
    }
}

/**
 * 403 - Forbidden
 * Use when authenticated but not authorized for this action
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, ErrorCode.FORBIDDEN, 403);
    }
}

/**
 * 404 - Not Found
 * Use when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        const message = id
            ? `${resource} with ID '${id}' not found`
            : `${resource} not found`;
        super(message, ErrorCode.NOT_FOUND, 404, { resource, id });
    }
}

/**
 * 409 - Conflict
 * Use when action conflicts with current state (e.g., duplicate key)
 */
export class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, ErrorCode.CONFLICT, 409, details);
    }
}

/**
 * 422 - Unprocessable Entity
 * Use when request is valid but cannot be processed due to semantic errors
 */
export class UnprocessableError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, ErrorCode.VALIDATION, 422, details);
    }
}

/**
 * 429 - Rate Limited
 * Use when too many requests
 */
export class RateLimitedError extends AppError {
    constructor(retryAfter?: number) {
        super('Too many requests, please try again later', ErrorCode.RATE_LIMITED, 429,
            retryAfter ? { retryAfter } : undefined);
    }
}

// ============================================
// Business Logic Errors (400)
// ============================================

/**
 * Business rule violation
 * Use when a valid request violates business rules
 */
export class BusinessRuleError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, ErrorCode.BUSINESS_RULE, 400, details);
    }
}

/**
 * Stock error
 * Use for inventory-related errors (out of stock, insufficient quantity)
 */
export class StockError extends AppError {
    constructor(message: string, productId?: string, available?: number, requested?: number) {
        super(message, ErrorCode.STOCK_ERROR, 400, { productId, available, requested });
    }
}

/**
 * Order error
 * Use for order-related business logic errors (invalid status transition, etc.)
 */
export class OrderError extends AppError {
    constructor(message: string, orderId?: string, details?: Record<string, unknown>) {
        super(message, ErrorCode.ORDER_ERROR, 400, { orderId, ...details });
    }
}

// ============================================
// 5xx Server Errors
// ============================================

/**
 * 500 - Internal Server Error
 * Use for unexpected errors
 */
export class InternalError extends AppError {
    public override readonly isOperational: boolean = false;

    constructor(message = 'An unexpected error occurred') {
        super(message, ErrorCode.INTERNAL, 500);
    }
}

/**
 * 503 - Service Unavailable
 * Use when a dependent service is down
 */
export class ServiceUnavailableError extends AppError {
    constructor(service: string) {
        super(`${service} is temporarily unavailable`, ErrorCode.SERVICE_UNAVAILABLE, 503, { service });
    }
}

// ============================================
// Utilities
// ============================================

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Wrap unknown errors in AppError for consistent handling
 */
export function wrapError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }

    if (error instanceof Error) {
        return new InternalError(error.message);
    }

    return new InternalError(String(error));
}
