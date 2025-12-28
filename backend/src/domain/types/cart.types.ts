/**
 * Cart Domain Interfaces
 * 
 * Strict Money Contract: All prices in cents (integer).
 */

export interface ICartItem {
    id: string; // UUID
    userId?: string; // Optional context
    cartId: string;
    productId: string;
    quantity: number;

    // SNAPSHOT PRICE (Source of Truth for Cart item value)
    priceCents: number;

    // Store (required for multi-store checkout - Phase 8.0)
    storeId?: string;

    // Computed/Joined
    totalPriceCents?: number;
    productTitle?: string;
    productSlug?: string;
    productImage?: string;
    variant?: any; // Phase 8.1: Variant Entegrasyonu
}

// Domain Interface
export interface ICart {
    id: string; // UUID
    userId: string | null; // Nullable for guest carts
    guestKey: string | null; // Unique key for guest carts
    items: ICartItem[];

    // Computed
    totalQuantity: number;
    totalPriceCents: number;

    createdAt: Date | string;
    updatedAt: Date | string;
}

// Service Inputs
export interface IAddToCartInput {
    userId?: string;
    guestKey?: string;
    productId: string;
    quantity: number;
}
