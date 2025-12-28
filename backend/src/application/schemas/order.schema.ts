/**
 * Order Schemas (Zod)
 * SINGLE SOURCE OF TRUTH for Order API contracts
 * 
 * All DTO types are derived via z.infer<typeof Schema>
 * This ensures schema + types + validation are always in sync.
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
 * Order ID param schema
 */
export const OrderIdParamSchema = z.object({
    id: UuidSchema,
});

/**
 * Shipping address schema
 */
export const ShippingAddressSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(200),
    phone: z.string().regex(/^[+]?[0-9\s()-]+$/, 'Invalid phone number format'),
    addressLine1: z.string().min(5, 'Address must be at least 5 characters').max(500),
    addressLine2: z.string().max(500).optional().or(z.literal('')),
    city: z.string().min(2, 'City is required').max(100),
    district: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().min(4, 'Postal code is required').max(20),
    country: z.string().min(2).max(100).default('Turkey'),
});

// ============================================
// ORDER STATUS
// ============================================

/**
 * Valid order statuses
 */
export const OrderStatusEnum = z.enum(['draft', 'pending', 'confirmed', 'cancelled']);

/**
 * Valid payment statuses
 */
export const PaymentStatusEnum = z.enum(['pending', 'paid', 'failed', 'refunded']);

/**
 * Valid payment methods
 */
export const PaymentMethodEnum = z.enum(['credit_card', 'cash_on_delivery', 'bank_transfer']);

// ============================================
// INPUT SCHEMAS (Request DTOs)
// ============================================

/**
 * Order item in create request
 */
export const CreateOrderItemSchema = z.object({
    productId: UuidSchema,
    quantity: z.number().int({
        message: 'Quantity must be an integer',
    }).min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
    variantId: UuidSchema.optional(),
});

/**
 * Create order request schema
 * POST /api/v2/orders
 */
export const CreateOrderSchema = z.object({
    storeId: UuidSchema,
    items: z.array(CreateOrderItemSchema).min(1, 'At least one item is required'),
    shippingAddress: ShippingAddressSchema,
    billingAddress: ShippingAddressSchema.optional(),
    paymentMethod: PaymentMethodEnum.default('credit_card'),
    customerNote: z.string().max(1000).optional().or(z.literal('')),
    idempotencyKey: z.string().max(255).optional(),
    couponCode: z.string().max(50).optional(),
});

/**
 * Update order status request schema
 * PATCH /api/v2/orders/:id/status
 */
export const UpdateOrderStatusSchema = z.object({
    status: OrderStatusEnum,
    cancellationReason: z.string().max(500).optional(),
    trackingNumber: z.string().max(100).optional(),
    carrier: z.string().max(100).optional(),
});

// ============================================
// OUTPUT SCHEMAS (Response DTOs)
// ============================================

/**
 * Order item in response (money as decimal for display)
 */
export const OrderItemResponseSchema = z.object({
    id: z.string(),
    productId: z.string(),
    productTitle: z.string(),
    productImage: z.string().optional(),
    quantity: z.number().int(),
    unitPrice: z.number(), // Decimal for display
    lineTotal: z.number(), // Decimal for display
    currency: z.string(),
});

/**
 * Order response schema (money as decimal for display)
 * All monetary values are converted from cents to decimal for API consumers
 */
export const OrderResponseSchema = z.object({
    id: z.string(),
    orderNumber: z.string(),
    status: OrderStatusEnum,
    paymentStatus: PaymentStatusEnum,

    // Items
    items: z.array(OrderItemResponseSchema),

    // Monetary values (decimal for display - converted from cents)
    subtotal: z.number(),
    shippingCost: z.number(),
    discount: z.number(),
    total: z.number(),
    currency: z.string(),

    // Addresses
    shippingAddress: ShippingAddressSchema,
    billingAddress: ShippingAddressSchema.optional(),

    // Tracking
    trackingNumber: z.string().optional(),
    carrier: z.string().optional(),

    // Notes
    customerNote: z.string().optional(),
    cancellationReason: z.string().optional(),

    // Timestamps
    createdAt: z.string(),
    updatedAt: z.string(),
    cancelledAt: z.string().optional(),
});

/**
 * Order summary for list views
 */
export const OrderSummarySchema = z.object({
    id: z.string(),
    orderNumber: z.string(),
    status: OrderStatusEnum,
    itemCount: z.number().int(),
    total: z.number(),
    currency: z.string(),
    createdAt: z.string(),
});

// ============================================
// RESPONSE ENVELOPES
// ============================================

export const OrderCreateResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: OrderResponseSchema,
});

export const OrderGetResponseSchema = OrderCreateResponseSchema;

export const OrderStatusUpdateResponseSchema = OrderCreateResponseSchema;

// ============================================
// INFERRED TYPES (Single Source)
// ============================================

/** Order ID params */
export type OrderIdParams = z.infer<typeof OrderIdParamSchema>;

/** Shipping address */
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

/** Create order request */
export type CreateOrderDTO = z.infer<typeof CreateOrderSchema>;

/** Create order item */
export type CreateOrderItemDTO = z.infer<typeof CreateOrderItemSchema>;

/** Update order status request */
export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusSchema>;

/** Order response */
export type OrderResponseDTO = z.infer<typeof OrderResponseSchema>;

/** Order item response */
export type OrderItemResponseDTO = z.infer<typeof OrderItemResponseSchema>;

/** Order summary */
export type OrderSummaryDTO = z.infer<typeof OrderSummarySchema>;

export type OrderCreateResponseDTO = z.infer<typeof OrderCreateResponseSchema>;
export type OrderGetResponseDTO = z.infer<typeof OrderGetResponseSchema>;
export type OrderStatusUpdateResponseDTO = z.infer<typeof OrderStatusUpdateResponseSchema>;

/** Order status values */
export type OrderStatusValue = z.infer<typeof OrderStatusEnum>;

/** Payment method values */
export type PaymentMethodValue = z.infer<typeof PaymentMethodEnum>;
