/**
 * Response Utilities
 * Standardized API response format for frontend integration
 */

import { Response } from 'express';

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    cursor?: string;
    sort?: string;
    summary?: unknown;
}

interface PaginationInput {
    page?: number;
    currentPage?: number;
    limit?: number;
    pageSize?: number;
    total?: number;
    totalItems?: number;
    count?: number;
    totalPages?: number;
    pages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    cursor?: string;
    sort?: string;
    summary?: unknown;
}

interface ApiResponse {
    success: boolean;
    message: string;
    data?: unknown;
    errors?: unknown;
    pagination?: PaginationMeta;
    timestamp: string;
}

/**
 * Success response
 */
const success = (res: Response, data: unknown = null, message: string = 'Success', statusCode: number = 200): Response => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Error response
 */
const error = (res: Response, message: string = 'An error occurred', statusCode: number = 400, errors: unknown = null): Response => {
    const response: ApiResponse = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Created response (201)
 */
const created = (res: Response, data: unknown = null, message: string = 'Resource created successfully'): Response => {
    return success(res, data, message, 201);
};

/**
 * No content response (204)
 */
const noContent = (res: Response): Response => {
    return res.status(204).send();
};

/**
 * Paginated response
 */
const paginated = (res: Response, data: unknown[], pagination: PaginationInput = {}, message: string = 'Success', statusCode: number = 200): Response => {
    const page = Number(pagination.page ?? pagination.currentPage ?? 1);
    const limit = Number(pagination.limit ?? pagination.pageSize ?? data.length ?? 0);
    const total = Number(
        pagination.total ?? pagination.totalItems ?? pagination.count ?? data.length ?? 0
    );
    const calculatedTotalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const totalPages = Number(pagination.totalPages ?? pagination.pages ?? calculatedTotalPages);
    const hasNext =
        typeof pagination.hasNext !== 'undefined' ? pagination.hasNext : page < totalPages;
    const hasPrev =
        typeof pagination.hasPrev !== 'undefined' ? pagination.hasPrev : page > 1;

    const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
    };

    if (typeof pagination.cursor !== 'undefined') {
        meta.cursor = pagination.cursor;
    }

    if (typeof pagination.sort !== 'undefined') {
        meta.sort = pagination.sort;
    }

    if (typeof pagination.summary !== 'undefined') {
        meta.summary = pagination.summary;
    }

    return res.status(statusCode).json({
        success: true,
        message,
        data,
        pagination: meta,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Unauthorized response (401)
 */
const unauthorized = (res: Response, message: string = 'Unauthorized access'): Response => {
    return error(res, message, 401);
};

/**
 * Forbidden response (403)
 */
const forbidden = (res: Response, message: string = 'Forbidden access'): Response => {
    return error(res, message, 403);
};

/**
 * Not found response (404)
 */
const notFound = (res: Response, message: string = 'Resource not found'): Response => {
    return error(res, message, 404);
};

/**
 * Validation error response (422)
 */
const validationError = (res: Response, errors: unknown, message: string = 'Validation failed'): Response => {
    return error(res, message, 422, errors);
};

/**
 * Internal server error response (500)
 */
const serverError = (res: Response, message: string = 'Internal server error'): Response => {
    return error(res, message, 500);
};

export {
    success,
    error,
    created,
    noContent,
    paginated,
    unauthorized,
    forbidden,
    notFound,
    validationError,
    serverError,
};

// CommonJS compatibility
module.exports = {
    success,
    error,
    created,
    noContent,
    paginated,
    unauthorized,
    forbidden,
    notFound,
    validationError,
    serverError,
};
