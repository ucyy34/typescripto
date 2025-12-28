/**
 * Product Domain Types
 * Pure TypeScript interfaces - no framework dependencies
 */

import { IEntity } from './common.types';

/**
 * Product approval status
 */
export type ProductStatus = 'pending' | 'approved' | 'rejected';

/**
 * Product interface
 * All monetary values in CENTS (integer) - source of truth
 */
export interface IProduct extends IEntity {
    storeId: string;
    categoryId: string;

    // Basic info
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;

    // Pricing - ALL IN CENTS
    priceCents: number;
    comparePriceCents?: number;
    costPriceCents?: number;
    currency: string;

    // Inventory
    stock: number;
    lowStockThreshold?: number;
    sku?: string;

    // Media
    images: string[];

    // Status
    isActive: boolean;
    isFeatured: boolean;
    status: ProductStatus;
    approvedAt?: Date;
    approvedBy?: string;

    // Metadata
    material?: string;
    technique?: string;
    dimensions?: string;
    weight?: number;

    // SEO
    seoTitle?: string;
    seoDescription?: string;
    metaKeywords?: string[];

    // Stats
    rating?: number;
    totalReviews?: number;
    totalSales?: number;
}

/**
 * Query options for fetching products
 */
export interface IProductQueryOptions {
    page?: number;
    limit?: number;
    categorySlug?: string;
    storeId?: string;
    search?: string;
    minPriceCents?: number;
    maxPriceCents?: number;
    isActive?: boolean;
    status?: ProductStatus;
}
