/**
 * Shared JSON/JSONB Types
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export interface ProductDimensions {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'in' | string;
}

export type ProductAttributes = Record<string, JsonValue>;

export interface ShipmentItemSnapshot {
    product_id?: string;
    title?: string;
    sku?: string | null;
    image?: string | null;
    quantity?: number;
    price?: number;
    [key: string]: JsonValue | undefined;
}

export type ShipmentEventPayload = JsonObject;

export type WishlistItemMetadata = JsonObject;

export type OrderPaymentDetails = JsonObject;
export type OrderAddress = JsonObject;

export type VendorPayoutBreakdown = JsonObject;
