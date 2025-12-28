import { z } from 'zod';
import { UuidSchema } from './product.schema';

// ==========================================
// SHARED SCHEMAS
// ==========================================

export const CartItemResponseSchema = z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),

    // Money fields (converted to decimal for display)
    price: z.number(), // Unit price (decimal)
    totalPrice: z.number(), // Line total (decimal)

    // Product Snapshot
    productTitle: z.string(),
    productSlug: z.string(),
    productImage: z.string().optional(),
});

export const CartResponseSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid().nullable(),
    guestKey: z.string().nullable(),
    totalQuantity: z.number().int().min(0),

    // Money fields (converted to decimal for display)
    totalPrice: z.number(), // Grand total (decimal)

    items: z.array(CartItemResponseSchema),
    updatedAt: z.string().datetime(),
});

export const GuestKeyHeaderSchema = z.string().min(1, { message: 'X-Guest-Key header is required' });

export const MergeCartSchema = z.object({
    guestKey: z.string().min(1)
});

export type MergeCartDTO = z.infer<typeof MergeCartSchema>;

// ==========================================
// REQUEST SCHEMAS
// ==========================================

export const AddToCartSchema = z.object({
    productId: UuidSchema,
    quantity: z.number().int().min(1).max(99).default(1),
});

export const UpdateCartItemSchema = z.object({
    quantity: z.number().int().min(1).max(99),
});

export const CartItemIdParamSchema = z.object({
    id: UuidSchema, // cart item UUID
});

// ==========================================
// TYPES
// ==========================================

export type CartItemResponseDTO = z.infer<typeof CartItemResponseSchema>;
export type CartResponseDTO = z.infer<typeof CartResponseSchema>;
export type AddToCartDTO = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemDTO = z.infer<typeof UpdateCartItemSchema>;
