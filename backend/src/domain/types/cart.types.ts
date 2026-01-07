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

export interface ICartVariantSelection {
    [optionName: string]: string;
}

export interface ICartItemVariant {
    id?: string;
    sku?: string;
    price?: number;
    stock?: number;
    selection?: ICartVariantSelection;
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

// Redis-backed cart state (snake_case keys)
export interface ICartStoredItem {
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    variant?: ICartItemVariant | null;
}

export interface ICartTotals {
    subtotal: number;
    item_count: number;
}

export interface ICartMetadata {
    updated_at?: string;
}

export interface ICartState {
    key: string | null;
    items: ICartStoredItem[];
    metadata: ICartMetadata;
}

export interface ICartStoreReference {
    id: string;
    name?: string;
    slug?: string;
}

export interface ICartCategoryReference {
    id: string;
    name?: string;
    slug?: string;
}

export interface ICartEnrichedItem extends ICartStoredItem {
    title: string;
    slug: string;
    compare_price?: number | null;
    images: string[];
    image?: string | null;
    stock: number | null;
    is_available: boolean;
    store?: ICartStoreReference;
    category?: ICartCategoryReference;
    item_total: number;
}

export interface ICartCheckoutItem extends ICartStoredItem {
    store?: ICartStoreReference;
    store_id?: string;
    storeId?: string;
    item_total?: number;
}

export interface ICartCheckoutPayload {
    id?: string;
    items: ICartCheckoutItem[];
    totals?: ICartTotals;
}

// Service Inputs
export interface IAddToCartInput {
    userId?: string;
    guestKey?: string;
    productId: string;
    quantity: number;
}
