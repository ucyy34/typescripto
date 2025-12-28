/**
 * Common Domain Types
 * Base interfaces used across all domain entities
 */

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
        role: string;
        [key: string]: any;
    };
    guestId?: string;
}

/**
 * Base entity interface - all domain objects have these fields
 */
export interface IEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Shipping address structure
 */
export interface IShippingAddress {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    district?: string;
    state?: string;
    postalCode: string;
    country: string;
}

/**
 * Pagination options for list queries
 */
export interface IPaginationOptions {
    page?: number;
    limit?: number;
}

/**
 * Paginated result wrapper
 */
export interface IPaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
