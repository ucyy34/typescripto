/**
 * V1 Order Adapter
 * 
 * Converts V1 request format (snake_case) to V2 format (camelCase) and back.
 * This is MAPPING ONLY - no business logic. All logic lives in V2 handlers.
 * 
 * DEPRECATION: V1 Order API is deprecated and will be removed on 2026-01-31.
 * Please migrate to /api/v2/orders endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { CreateOrderDTO, ShippingAddress } from '../schemas/order.schema';

// ============================================
// DEPRECATION CONSTANTS
// ============================================

export const V1_DEPRECATION_DATE = '2026-01-31';
export const V1_DEPRECATION_LINK = 'https://docs.dosttan.com/api/v2/orders';

/**
 * Add deprecation headers to V1 responses
 */
export function addDeprecationHeaders(res: Response): void {
    res.set('Deprecation', 'true');
    res.set('Sunset', V1_DEPRECATION_DATE);
    res.set('Link', `<${V1_DEPRECATION_LINK}>; rel="successor-version"`);
}

/**
 * Log V1 deprecation warning
 */
export function logDeprecationWarning(req: Request): void {
    const clientInfo = req.get('User-Agent') || 'Unknown';
    const route = `${req.method} ${req.originalUrl}`;
    console.warn(`[DEPRECATED] V1 Order API hit: ${route} - Client: ${clientInfo.substring(0, 50)}`);
}

// ============================================
// REQUEST MAPPING: V1 → V2
// ============================================

/**
 * Convert V1 shipping address (snake_case) to V2 format (camelCase)
 */
export function mapV1AddressToV2(v1Address: Record<string, unknown>): ShippingAddress {
    return {
        fullName: String(v1Address.full_name || ''),
        phone: String(v1Address.phone || ''),
        addressLine1: String(v1Address.address_line1 || ''),
        addressLine2: v1Address.address_line2 ? String(v1Address.address_line2) : undefined,
        city: String(v1Address.city || ''),
        district: v1Address.district ? String(v1Address.district) : undefined,
        state: v1Address.state ? String(v1Address.state) : undefined,
        postalCode: String(v1Address.postal_code || ''),
        country: String(v1Address.country || 'Turkey'),
    };
}

/**
 * Convert V1 create order request to V2 format
 */
export function mapV1CreateOrderToV2(v1Body: Record<string, unknown>): CreateOrderDTO {
    // Map items array (product_id -> productId)
    const v1Items = (v1Body.items as Array<Record<string, unknown>>) || [];
    const v2Items = v1Items.map((item) => ({
        productId: String(item.product_id || ''),
        quantity: Number(item.quantity || 1),
        variantId: item.variant_id ? String(item.variant_id) : undefined,
    }));

    // Map shipping address
    const v1ShippingAddress = (v1Body.shipping_address as Record<string, unknown>) || {};
    const v2ShippingAddress = mapV1AddressToV2(v1ShippingAddress);

    // Map billing address if present
    const v1BillingAddress = v1Body.billing_address as Record<string, unknown> | undefined;
    const v2BillingAddress = v1BillingAddress ? mapV1AddressToV2(v1BillingAddress) : undefined;

    // Map payment method (normalize some V1 values)
    let paymentMethod = String(v1Body.payment_method || 'credit_card');
    if (paymentMethod === 'card' || paymentMethod === 'debit_card') {
        paymentMethod = 'credit_card';
    }

    return {
        storeId: String(v1Body.store_id || ''),
        items: v2Items,
        shippingAddress: v2ShippingAddress,
        billingAddress: v2BillingAddress,
        paymentMethod: paymentMethod as 'credit_card' | 'cash_on_delivery' | 'bank_transfer',
        customerNote: v1Body.customer_note ? String(v1Body.customer_note) : undefined,
        idempotencyKey: v1Body.idempotency_key ? String(v1Body.idempotency_key) : undefined,
        couponCode: v1Body.coupon_code ? String(v1Body.coupon_code) : undefined,
    };
}

/**
 * Convert V1 update status request to V2 format
 */
export function mapV1UpdateStatusToV2(v1Body: Record<string, unknown>): Record<string, unknown> {
    return {
        status: v1Body.status,
        trackingNumber: v1Body.tracking_number,
        carrier: v1Body.carrier,
        cancellationReason: v1Body.cancellation_reason,
    };
}

// ============================================
// RESPONSE MAPPING: V2 → V1
// ============================================

/**
 * Convert V2 address to V1 format (camelCase -> snake_case)
 */
export function mapV2AddressToV1(v2Address: Record<string, unknown>): Record<string, unknown> {
    return {
        full_name: v2Address.fullName,
        phone: v2Address.phone,
        address_line1: v2Address.addressLine1,
        address_line2: v2Address.addressLine2,
        city: v2Address.city,
        district: v2Address.district,
        state: v2Address.state,
        postal_code: v2Address.postalCode,
        country: v2Address.country,
    };
}

/**
 * Convert V2 order item to V1 format
 */
export function mapV2OrderItemToV1(v2Item: Record<string, unknown>): Record<string, unknown> {
    return {
        id: v2Item.id,
        product_id: v2Item.productId,
        product_title: v2Item.productTitle,
        product_image: v2Item.productImage,
        quantity: v2Item.quantity,
        unit_price: v2Item.unitPrice,
        line_total: v2Item.lineTotal,
        currency: v2Item.currency,
    };
}

/**
 * Convert V2 order response to V1 format
 */
export function mapV2OrderResponseToV1(v2Order: Record<string, unknown>): Record<string, unknown> {
    // Map items
    const v2Items = (v2Order.items as Array<Record<string, unknown>>) || [];
    const v1Items = v2Items.map(mapV2OrderItemToV1);

    // Map addresses
    const v2ShippingAddress = v2Order.shippingAddress as Record<string, unknown>;
    const v2BillingAddress = v2Order.billingAddress as Record<string, unknown> | undefined;

    return {
        id: v2Order.id,
        order_number: v2Order.orderNumber,
        status: v2Order.status,
        payment_status: v2Order.paymentStatus,
        items: v1Items,
        subtotal: v2Order.subtotal,
        shipping_cost: v2Order.shippingCost,
        discount: v2Order.discount,
        total: v2Order.total,
        currency: v2Order.currency,
        shipping_address: v2ShippingAddress ? mapV2AddressToV1(v2ShippingAddress) : null,
        billing_address: v2BillingAddress ? mapV2AddressToV1(v2BillingAddress) : null,
        tracking_number: v2Order.trackingNumber,
        carrier: v2Order.carrier,
        customer_note: v2Order.customerNote,
        cancellation_reason: v2Order.cancellationReason,
        created_at: v2Order.createdAt,
        updated_at: v2Order.updatedAt,
        cancelled_at: v2Order.cancelledAt,
    };
}

// ============================================
// MIDDLEWARE: V1 Request Transformer
// ============================================

/**
 * Middleware that transforms V1 request body to V2 format
 * Should be placed BEFORE V2 handler in route chain
 */
export function transformV1CreateOrderRequest(req: Request, _res: Response, next: NextFunction): void {
    // Log deprecation warning
    logDeprecationWarning(req);

    // Transform request body from V1 to V2 format
    req.body = mapV1CreateOrderToV2(req.body);

    next();
}

/**
 * Middleware that transforms V1 status update request to V2 format
 */
export function transformV1UpdateStatusRequest(req: Request, _res: Response, next: NextFunction): void {
    // Log deprecation warning
    logDeprecationWarning(req);

    // Transform request body from V1 to V2 format
    req.body = mapV1UpdateStatusToV2(req.body);

    next();
}

// ============================================
// RESPONSE WRAPPER
// ============================================

/**
 * Wrap V2 handler and transform response to V1 format
 * Also adds deprecation headers
 */
export function wrapV2HandlerForV1(
    v2Handler: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Add deprecation headers
        addDeprecationHeaders(res);

        // Capture the original res.json to transform response
        const originalJson = res.json.bind(res);

        res.json = function (body: unknown): Response {
            // Transform V2 response to V1 format
            if (body && typeof body === 'object') {
                const bodyObj = body as Record<string, unknown>;

                // If response has a data field with order data, transform it
                if (bodyObj.data && typeof bodyObj.data === 'object') {
                    const data = bodyObj.data as Record<string, unknown>;

                    // Check if it looks like an order response
                    if (data.orderNumber || data.order_number) {
                        bodyObj.data = mapV2OrderResponseToV1(data);
                    }
                }
            }

            return originalJson(body);
        };

        try {
            await v2Handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}
