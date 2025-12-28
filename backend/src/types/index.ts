/**
 * Common API Response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    error?: any;
}

/**
 * User Domain Model
 */
export interface User {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: 'admin' | 'seller' | 'buyer';
    is_verified: boolean;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

/**
 * Product Domain Model
 */
export interface Product {
    id: string;
    title: string;
    slug: string;
    price: number;
    compare_price?: number;
    stock: number;
    description?: string;
    images: string[];
    store_id: string;
    category_id: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    is_active: boolean;
}

/**
 * Cart Domain Model
 */
export interface CartItem {
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    product?: Product;
}

export interface Cart {
    id: string;
    user_id?: string;
    guest_id?: string;
    items: CartItem[];
    total_price: number;
    created_at?: Date;
    updated_at?: Date;
}

/**
 * Checkout Initialization payload
 */
export interface CheckoutInit {
    cart_id: string;
    shipping_address_id?: string;
    billing_address_id?: string;
    payment_method?: string;
}

export enum OrderStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PREPARING = 'preparing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    store_id: string;
    vendor_id: string; // Now mandatory

    // Snapshot Info
    product_snapshot: any; // Simplified JSON

    // Financials (Source of Truth)
    unit_amount_cents: number;
    line_total_amount_cents: number;
    currency: string;

    quantity: number;

    // Legacy/Derived (Optional)
    price?: number;
    total?: number;
    tax_rate?: number;
}

export interface Order {
    id: string;
    user_id: string;
    store_id: string;
    status: OrderStatus;
    total_amount_cents: number;
    currency: string;

    // Relations
    items: OrderItem[];

    created_at: Date;
    updated_at: Date;
    idempotency_key?: string;
}

export interface VendorSplit {
    vendor_id: string;
    amount_cents: number;
    currency: string;
}

