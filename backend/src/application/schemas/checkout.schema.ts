import { z } from 'zod';

// ==========================================
// SHARED SCHEMAS
// ==========================================

/**
 * Shipping Address Schema (reused in checkout)
 */
export const ShippingAddressSchema = z.object({
    fullName: z.string().min(2).max(100),
    phone: z.string().min(10).max(20),
    addressLine1: z.string().min(5).max(200),
    addressLine2: z.string().max(200).optional(),
    city: z.string().min(2).max(100),
    state: z.string().max(100).optional(),
    postalCode: z.string().min(3).max(20),
    country: z.string().min(2).max(100).default('TR'),
});

/**
 * Payment Method (mock only for now)
 */
export const PaymentMethodSchema = z.enum(['mock', 'cash_on_delivery']);

// ==========================================
// CHECKOUT INIT
// ==========================================

export const CheckoutInitRequestSchema = z.object({
    shippingAddress: ShippingAddressSchema.optional(),
    couponCode: z.string().max(50).optional(),
});

export const CheckoutInitLineItemSchema = z.object({
    cartItemId: z.string().uuid(),
    productId: z.string().uuid(),
    title: z.string(),
    quantity: z.number().int().min(1),
    unitPrice: z.number(), // Decimal for display
    lineTotal: z.number(), // Decimal for display
});

export const CheckoutTotalsSchema = z.object({
    subtotal: z.number(), // Decimal
    shipping: z.number(), // Decimal
    discount: z.number(), // Decimal
    total: z.number(),    // Decimal
    currency: z.string().default('TRY'),
});

export const CheckoutInitResponseSchema = z.object({
    success: z.literal(true),
    items: z.array(CheckoutInitLineItemSchema),
    totals: CheckoutTotalsSchema,
    shippingOptions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        priceCents: z.number().int(),
    })).default([]),
});

// ==========================================
// CHECKOUT CONFIRM
// ==========================================

export const CheckoutConfirmRequestSchema = z.object({
    idempotencyKey: z.string().min(16, { message: 'idempotencyKey must be at least 16 characters' }),
    shippingAddress: ShippingAddressSchema,
    paymentMethod: PaymentMethodSchema,
    notes: z.string().max(500).optional(),
});

export const CheckoutConfirmResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        orderIds: z.array(z.string().uuid()),
        orderNumbers: z.array(z.string()),
        orders: z.array(z.object({
            orderId: z.string().uuid(),
            orderNumber: z.string(),
            status: z.string(),
            storeId: z.string().uuid(),
            storeName: z.string(),
            subtotal: z.number(),
            shipping: z.number(),
            total: z.number(),
        })),
        totals: CheckoutTotalsSchema,
        orderId: z.string().uuid(),
        orderNumber: z.string(),
        status: z.string(),
    }),
    idempotencyKey: z.string(),
    createdAt: z.string().datetime(),
});

// ==========================================
// CHECKOUT STATUS
// ==========================================

export const CheckoutStatusParamSchema = z.object({
    idempotencyKey: z.string().min(16),
});

export const CheckoutStatusResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        orderId: z.string().uuid(),
        orderNumber: z.string(),
        status: z.string(),
        totals: CheckoutTotalsSchema,
    }),
    idempotencyKey: z.string(),
    createdAt: z.string().datetime(),
});

// ==========================================
// TYPES (inferred from schemas)
// ==========================================

export type ShippingAddressDTO = z.infer<typeof ShippingAddressSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export type CheckoutInitRequestDTO = z.infer<typeof CheckoutInitRequestSchema>;
export type CheckoutInitLineItemDTO = z.infer<typeof CheckoutInitLineItemSchema>;
export type CheckoutTotalsDTO = z.infer<typeof CheckoutTotalsSchema>;
export type CheckoutInitResponseDTO = z.infer<typeof CheckoutInitResponseSchema>;

export type CheckoutConfirmRequestDTO = z.infer<typeof CheckoutConfirmRequestSchema>;
export type CheckoutConfirmResponseDTO = z.infer<typeof CheckoutConfirmResponseSchema>;

export type CheckoutStatusParamDTO = z.infer<typeof CheckoutStatusParamSchema>;
export type CheckoutStatusResponseDTO = z.infer<typeof CheckoutStatusResponseSchema>;
