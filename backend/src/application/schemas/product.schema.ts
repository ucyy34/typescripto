/**
 * Product Schemas (Zod)
 * SINGLE SOURCE OF TRUTH for Product API contracts
 * 
 * All DTO types are derived via z.infer<typeof Schema>
 * This ensures schema + types + validation are always in sync.
 * 
 * MONEY CONTRACT: price_cents is the source of truth (INTEGER).
 * Response layer converts cents → decimal for display ONLY.
 */

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

/**
 * UUID validation schema
 */
export const UuidSchema = z.string().uuid({
    message: 'Must be a valid UUID',
});

/**
 * Product ID param schema
 */
export const ProductIdParamSchema = z.object({
    id: UuidSchema,
});

/**
 * Product status enum
 */
export const ProductStatusEnum = z.enum(['draft', 'pending', 'approved', 'rejected']);

// ============================================
// QUERY SCHEMAS (for GET requests)
// ============================================

/**
 * Product list query parameters
 * GET /api/v2/products
 */
export const ProductListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: UuidSchema.optional(),
    storeId: UuidSchema.optional(),
    search: z.string().max(200).optional(),
    minPriceCents: z.coerce.number().int().min(0).optional(),
    maxPriceCents: z.coerce.number().int().min(0).optional(),
    status: ProductStatusEnum.optional(),
    isActive: z.coerce.boolean().optional(),
    isFeatured: z.coerce.boolean().optional(),
    sortBy: z.enum(['created_at', 'price_cents', 'rating', 'total_sales']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// INPUT SCHEMAS (for POST/PUT requests)
// ============================================

/**
 * Product dimensions schema
 */
export const ProductDimensionsSchema = z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
}).optional();

/**
 * Create product request schema
 * POST /api/v2/products
 * 
 * MONEY CONTRACT: All prices MUST be integers (cents).
 */
export const CreateProductSchema = z.object({
    storeId: UuidSchema,
    categoryId: UuidSchema,
    title: z.string().min(5, 'Title must be at least 5 characters').max(300),
    description: z.string().max(10000).optional(),
    shortDescription: z.string().max(500).optional(),
    sku: z.string().max(100).optional(),

    // MONEY: Must be integers (cents) - NO decimals allowed
    priceCents: z.number().int({
        message: 'priceCents must be an integer (cents)',
    }).min(0, 'Price cannot be negative'),
    comparePriceCents: z.number().int({
        message: 'comparePriceCents must be an integer (cents)',
    }).min(0).optional(),
    costPriceCents: z.number().int({
        message: 'costPriceCents must be an integer (cents)',
    }).min(0).optional(),

    stock: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(10),

    images: z.array(z.string().url()).max(10).default([]),

    weight: z.number().min(0).optional(),
    dimensions: ProductDimensionsSchema,

    material: z.string().max(200).optional(),
    technique: z.string().max(200).optional(),

    attributes: z.record(z.string(), z.unknown()).default({}),

    seoTitle: z.string().max(200).optional(),
    seoDescription: z.string().max(500).optional(),
    metaKeywords: z.array(z.string()).max(20).default([]),
    tags: z.array(z.string()).max(20).default([]),
    badges: z.array(z.string()).max(10).default([]),

    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
});

// ============================================
// OUTPUT SCHEMAS (Response DTOs)
// ============================================

/**
 * Product response schema
 * All monetary values are converted from cents to decimal for API consumers
 */
export const ProductResponseSchema = z.object({
    id: z.string(),
    storeId: z.string(),
    categoryId: z.string(),

    title: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    sku: z.string().optional(),

    // Monetary values (decimal for display - converted from cents)
    price: z.number(),
    comparePrice: z.number().optional(),
    costPrice: z.number().optional(),
    currency: z.string(),

    stock: z.number(),
    lowStockThreshold: z.number(),

    images: z.array(z.string()),

    status: ProductStatusEnum,
    isActive: z.boolean(),
    isFeatured: z.boolean(),

    weight: z.number().optional(),
    dimensions: ProductDimensionsSchema,

    material: z.string().optional(),
    technique: z.string().optional(),

    attributes: z.record(z.string(), z.unknown()),

    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    metaKeywords: z.array(z.string()),
    tags: z.array(z.string()),
    badges: z.array(z.string()),

    rating: z.number(),
    totalReviews: z.number(),
    totalSales: z.number(),
    viewsCount: z.number(),

    createdAt: z.string(),
    updatedAt: z.string(),
});

/**
 * Product list item (lighter version for lists)
 */
export const ProductListItemSchema = z.object({
    id: z.string(),
    storeId: z.string(),
    title: z.string(),
    slug: z.string(),
    price: z.number(),
    comparePrice: z.number().optional(),
    currency: z.string(),
    images: z.array(z.string()),
    rating: z.number(),
    totalReviews: z.number(),
    stock: z.number(),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
});

// ============================================
// RESPONSE ENVELOPES
// ============================================

export const PaginationSchema = z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    pages: z.number().int(),
});

export const ProductListResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        items: z.array(ProductListItemSchema),
        pagination: PaginationSchema,
    }),
});

export const ProductDetailResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: ProductResponseSchema,
});

export const ProductCreateResponseSchema = ProductDetailResponseSchema;

// ============================================
// INFERRED TYPES (Single Source)
// ============================================

/** Product ID params */
export type ProductIdParams = z.infer<typeof ProductIdParamSchema>;

/** Product list query */
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

/** Create product request */
export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

/** Product response */
export type ProductResponseDTO = z.infer<typeof ProductResponseSchema>;

/** Product list item */
export type ProductListItemDTO = z.infer<typeof ProductListItemSchema>;
export type PaginationDTO = z.infer<typeof PaginationSchema>;
export type ProductListResponseDTO = z.infer<typeof ProductListResponseSchema>;
export type ProductDetailResponseDTO = z.infer<typeof ProductDetailResponseSchema>;
export type ProductCreateResponseDTO = z.infer<typeof ProductCreateResponseSchema>;

/** Product status values */
export type ProductStatusValue = z.infer<typeof ProductStatusEnum>;
