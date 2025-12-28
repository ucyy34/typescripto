/**
 * Product Routes V2 (Zod Validated)
 * Canonical path: /api/v2/products
 * 
 * Uses Zod schemas as single source of truth for validation and types.
 * All monetary values are cents (integer) - no decimals accepted in input.
 */

import { Router } from 'express';
import { listProducts, getProduct, createProduct } from '../controllers/product.controller';
import { validateZod } from '../middlewares/zodValidate';
import {
    ProductListQuerySchema,
    CreateProductSchema,
    ProductIdParamSchema
} from '../schemas/product.schema';

// Import auth middleware (existing)
const { authenticate, optionalAuth, requireSeller } = require('../../middlewares/auth');

const router = Router();

// ============================================
// V2 PRODUCT ROUTES (Canonical)
// ============================================

/**
 * GET /api/v2/products
 * List products with pagination and filters
 * 
 * Validates: ProductListQuerySchema
 */
router.get(
    '/',
    optionalAuth,
    validateZod(ProductListQuerySchema, 'query'),
    listProducts
);

/**
 * GET /api/v2/products/:id
 * Get product by ID
 * 
 * Validates: ProductIdParamSchema (params)
 */
router.get(
    '/:id',
    optionalAuth,
    validateZod(ProductIdParamSchema, 'params'),
    getProduct
);

/**
 * POST /api/v2/products
 * Create new product
 * 
 * Validates: CreateProductSchema
 * Auth: seller or admin required
 * 
 * MONEY CONTRACT: priceCents MUST be integer (cents)
 */
router.post(
    '/',
    authenticate,
    requireSeller,
    validateZod(CreateProductSchema, 'body'),
    createProduct
);

export default router;
