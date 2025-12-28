/**
 * Order Fulfillment Schemas (Phase 8.1)
 * Zod single-source validation for status + tracking endpoints
 */

import { z } from 'zod';
// Note: Using string values directly in Zod enum instead of importing OrderStatus

// ==========================================
// PARAM SCHEMAS
// ==========================================

/**
 * Order ID parameter validation (UUID)
 */
export const OrderIdParamSchema = z.object({
    id: z.string().uuid('Invalid order ID format'),
});

export type OrderIdParamDTO = z.infer<typeof OrderIdParamSchema>;

// ==========================================
// STATUS UPDATE
// ==========================================

/**
 * Valid status values for update endpoint
 */
export const OrderStatusEnum = z.enum([
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
]);

/**
 * Update order status request
 */
export const UpdateOrderStatusSchema = z.object({
    status: OrderStatusEnum,
});

export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusSchema>;

// ==========================================
// TRACKING UPDATE
// ==========================================

/**
 * Update order tracking info request
 */
export const UpdateOrderTrackingSchema = z.object({
    carrier: z.string()
        .min(2, 'Carrier name must be at least 2 characters')
        .max(100, 'Carrier name too long'),
    trackingNumber: z.string()
        .min(3, 'Tracking number must be at least 3 characters')
        .max(100, 'Tracking number too long'),
});

export type UpdateOrderTrackingDTO = z.infer<typeof UpdateOrderTrackingSchema>;

// ==========================================
// RESPONSE SCHEMAS
// ==========================================

/**
 * Order status response
 */
export const OrderStatusResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        orderId: z.string(),
        orderNumber: z.string(),
        previousStatus: z.string(),
        newStatus: z.string(),
        updatedAt: z.string(),
    }),
});

export type OrderStatusResponseDTO = z.infer<typeof OrderStatusResponseSchema>;

/**
 * Order tracking response
 */
export const OrderTrackingResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        orderId: z.string(),
        orderNumber: z.string(),
        carrier: z.string(),
        trackingNumber: z.string(),
        status: z.string(),
        shippedAt: z.string().nullable(),
    }),
});

export type OrderTrackingResponseDTO = z.infer<typeof OrderTrackingResponseSchema>;
