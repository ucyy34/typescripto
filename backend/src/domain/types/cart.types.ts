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
    variant?: ICartItemVariant | null; // Phase 8.1: Variant Entegrasyonu
}

export type VariantSelectionValue = string | number | boolean | null;

export interface ICartItemVariantSelection {
    [key: string]: VariantSelectionValue;
}

export interface ICartItemVariant {
    id?: string;
    sku?: string | null;
    price?: number | null;
    stock?: number | null;
    selection?: ICartItemVariantSelection | null;
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

export interface CartCheckoutInput {
    store_id?: string;
    shipping_address?: {
        fullName?: string;
        phone?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        [key: string]: string | number | boolean | null | undefined;
    };
    billing_address?: {
        fullName?: string;
        phone?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        [key: string]: string | number | boolean | null | undefined;
    };
    payment_method?: string;
    customer_note?: string;
}
