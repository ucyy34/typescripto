/**
 * AppError
 * Unified error class for domain logic
 */

export enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTH_ERROR = 'AUTH_ERROR',
    STOCK_ERROR = 'STOCK_ERROR',
    ORDER_ERROR = 'ORDER_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly details?: any;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        statusCode: number = 500,
        details?: any
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}
