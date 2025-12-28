/**
 * V1 Order Routes (Deprecated)
 * 
 * These routes use the V1 adapter to transform requests/responses
 * but delegate all business logic to V2 handlers.
 * 
 * DEPRECATION NOTICE: These endpoints will be removed on 2026-01-31.
 * Please migrate to /api/v2/orders endpoints.
 */

import { Router } from 'express';
import { createOrder, updateOrderStatus, getOrder } from '../../application/controllers/order.controller';
import { validateZod, validateMultiple } from '../../application/middlewares/zodValidate';
import { CreateOrderSchema, UpdateOrderStatusSchema, OrderIdParamSchema } from '../../application/schemas/order.schema';
import {
    transformV1CreateOrderRequest,
    transformV1UpdateStatusRequest,
    wrapV2HandlerForV1,
    addDeprecationHeaders,
    logDeprecationWarning,
} from '../../application/adapters/v1OrderAdapter';

// Import existing auth middleware
const { authenticate, optionalAuth, requireSellerOrAdmin } = require('../../middlewares/auth');

const router = Router();

// ============================================
// DEPRECATED V1 ORDER ROUTES
// These forward to V2 handlers after request transformation
// ============================================

/**
 * POST /api/v1/orders
 * Create a new order (V1 format: snake_case)
 * 
 * @deprecated Use POST /api/v2/orders instead
 */
router.post(
    '/',
    optionalAuth,
    transformV1CreateOrderRequest, // V1 → V2 request mapping
    validateZod(CreateOrderSchema, 'body'), // V2 Zod validation
    wrapV2HandlerForV1(createOrder) // V2 handler with response transformation
);

/**
 * GET /api/v1/orders/:id
 * Get order by ID
 * 
 * @deprecated Use GET /api/v2/orders/:id instead
 */
router.get(
    '/:id',
    authenticate,
    (req, res, next) => {
        logDeprecationWarning(req);
        addDeprecationHeaders(res);
        next();
    },
    validateZod(OrderIdParamSchema, 'params'),
    wrapV2HandlerForV1(getOrder)
);

/**
 * PATCH /api/v1/orders/:id/status
 * Update order status (V1 format: snake_case)
 * 
 * @deprecated Use PATCH /api/v2/orders/:id/status instead
 */
router.patch(
    '/:id/status',
    authenticate,
    requireSellerOrAdmin,
    transformV1UpdateStatusRequest, // V1 → V2 request mapping
    validateMultiple([
        { schema: OrderIdParamSchema, target: 'params' },
        { schema: UpdateOrderStatusSchema, target: 'body' },
    ]),
    wrapV2HandlerForV1(updateOrderStatus)
);

export default router;
