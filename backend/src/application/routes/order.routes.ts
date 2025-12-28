/**
 * Order Routes V2 (Zod Validated)
 * Canonical path: /api/v2/orders
 * 
 * Uses Zod schemas as single source of truth for validation and types.
 */

import { Router } from 'express';
import { createOrder, updateOrderStatus, getOrder } from '../controllers/order.controller';
import { validateZod, validateMultiple } from '../middlewares/zodValidate';
import {
    CreateOrderSchema,
    UpdateOrderStatusSchema,
    OrderIdParamSchema
} from '../schemas/order.schema';
import {
    OrderIdParamSchema as OrderIdParamSchemaV2,
    UpdateOrderStatusSchema as UpdateOrderStatusSchemaV2,
    UpdateOrderTrackingSchema,
} from '../schemas/order-fulfillment.schema';

// Import auth middleware (existing)
const { authenticate, optionalAuth } = require('../../middlewares/auth');

const router = Router();

// ============================================
// V2 ORDER ROUTES (Canonical)
// ============================================

/**
 * POST /api/v2/orders
 * Create a new order (supports guest checkout with optionalAuth)
 * 
 * Validates: CreateOrderSchema
 */
router.post(
    '/',
    optionalAuth,
    validateZod(CreateOrderSchema, 'body'),
    createOrder
);

/**
 * GET /api/v2/orders/:id
 * Get order by ID
 * 
 * Validates: OrderIdParamSchema (params)
 */
router.get(
    '/:id',
    authenticate,
    validateZod(OrderIdParamSchema, 'params'),
    getOrder
);

/**
 * PATCH /api/v2/orders/:id/status
 * Update order status
 * 
 * Validates: OrderIdParamSchema (params) + UpdateOrderStatusSchema (body)
 */
router.patch(
    '/:id/status',
    authenticate,
    validateMultiple([
        { schema: OrderIdParamSchema, target: 'params' },
        { schema: UpdateOrderStatusSchema, target: 'body' },
    ]),
    updateOrderStatus
);

// ==========================================
// PHASE 8.1: FULFILLMENT ROUTES (V2)
// ==========================================

import { updateStatusV2, updateTracking } from '../controllers/order.controller';
// Note: Validation is done inside controllers using Zod schemas from order-fulfillment.schema.ts

/**
 * PATCH /api/v2/orders/:id/status/v2
 * Update order status with transition validation
 * 
 * Admin/seller only - buyer gets 403
 */
router.patch(
    '/:id/status/v2',
    authenticate,
    validateMultiple([
        { schema: OrderIdParamSchemaV2, target: 'params' },
        { schema: UpdateOrderStatusSchemaV2, target: 'body' },
    ]),
    updateStatusV2
);

/**
 * PATCH /api/v2/orders/:id/tracking
 * Update order tracking info
 * 
 * - Only for processing/shipped orders
 * - Auto-sets status to shipped
 * - Admin/seller only
 */
router.patch(
    '/:id/tracking',
    authenticate,
    validateMultiple([
        { schema: OrderIdParamSchemaV2, target: 'params' },
        { schema: UpdateOrderTrackingSchema, target: 'body' },
    ]),
    updateTracking
);

export default router;
