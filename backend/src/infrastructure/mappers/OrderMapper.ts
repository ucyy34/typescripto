/**
 * Order Mapper
 * Maps between Sequelize models and Domain types
 * 
 * RULE: Cents columns are source of truth. NO decimal fallback.
 */

import {
    IOrder,
    IOrderItem,
    OrderStatus,
    PaymentStatus,
    IProductSnapshot
} from '../../domain/types/order.types';
import { IShippingAddress } from '../../domain/types/common.types';

/**
 * Maps Sequelize Order model to domain IOrder
 */
export class OrderMapper {
    /**
     * Convert Sequelize Order instance to domain IOrder
     * @param raw - Sequelize model instance (with items included)
     */
    static toDomain(raw: any): IOrder {
        if (!raw) {
            throw new Error('OrderMapper.toDomain: raw is null/undefined');
        }

        return {
            id: raw.id,
            orderNumber: raw.order_number,
            userId: raw.user_id,
            storeId: raw.store_id,
            status: raw.status as OrderStatus,
            paymentStatus: (raw.payment_status || 'pending') as PaymentStatus,

            // Items
            items: Array.isArray(raw.items)
                ? raw.items.map(OrderMapper.itemToDomain)
                : [],

            // Monetary values - CENTS ONLY (no fallback to decimal)
            subtotalCents: raw.subtotal_cents ?? 0,
            shippingCostCents: raw.shipping_cost_cents ?? 0,
            discountCents: raw.discount_cents ?? 0,
            totalCents: raw.total_cents ?? 0,
            currency: raw.currency || 'TRY',

            // Shipping address
            shippingAddress: OrderMapper.parseAddress(raw.shipping_address),
            billingAddress: raw.billing_address
                ? OrderMapper.parseAddress(raw.billing_address)
                : undefined,

            // Shipping support fields (cents)
            shippingActualCostCents: raw.shipping_actual_cost_cents,
            shippingCustomerPaidCents: raw.shipping_customer_paid_cents,
            shippingStoreCoveredCents: raw.shipping_store_covered_cents,
            shippingPlatformCoveredCents: raw.shipping_platform_covered_cents,
            shippingStoreOwesPlatformCents: raw.shipping_store_owes_platform_cents,
            shippingRuleId: raw.shipping_rule_id,

            // Coupon
            couponCode: raw.coupon_code,
            couponDiscountCents: raw.coupon_discount_cents,

            // Tracking
            trackingNumber: raw.tracking_number,
            carrier: raw.carrier,

            // Notes
            customerNote: raw.customer_note,
            cancellationReason: raw.cancellation_reason,
            cancelledAt: raw.cancelled_at ? new Date(raw.cancelled_at) : undefined,

            // Idempotency
            idempotencyKey: raw.idempotency_key,

            // Timestamps
            createdAt: new Date(raw.created_at),
            updatedAt: new Date(raw.updated_at),
        };
    }

    /**
     * Convert Sequelize OrderItem to domain IOrderItem
     */
    static itemToDomain(raw: any): IOrderItem {
        return {
            id: raw.id,
            orderId: raw.order_id,
            productId: raw.product_id,
            vendorId: raw.vendor_id || raw.store_id,
            quantity: raw.quantity,

            // CENTS ONLY - no fallback
            unitAmountCents: raw.unit_amount_cents ?? 0,
            lineTotalAmountCents: raw.line_total_amount_cents ?? 0,
            currency: raw.currency || 'TRY',

            productSnapshot: OrderMapper.parseProductSnapshot(raw.product_snapshot),
        };
    }

    /**
     * Parse shipping address from JSON or object
     */
    static parseAddress(data: any): IShippingAddress {
        if (!data) {
            return {
                fullName: '',
                phone: '',
                addressLine1: '',
                city: '',
                postalCode: '',
                country: 'Turkey',
            };
        }

        // Handle both snake_case (DB) and camelCase (frontend) formats
        return {
            fullName: data.full_name || data.fullName || '',
            phone: data.phone || '',
            addressLine1: data.address_line1 || data.addressLine1 || '',
            addressLine2: data.address_line2 || data.addressLine2,
            city: data.city || '',
            district: data.district,
            state: data.state,
            postalCode: data.postal_code || data.postalCode || '',
            country: data.country || 'Turkey',
        };
    }

    /**
     * Parse product snapshot from JSON
     */
    static parseProductSnapshot(data: any): IProductSnapshot {
        if (!data) {
            return { title: 'Unknown Product' };
        }

        return {
            title: data.title || 'Unknown Product',
            sku: data.sku,
            imageUrl: data.image_url || data.imageUrl || data.image,
        };
    }

    /**
     * Convert domain IOrder to Sequelize-compatible object for persistence
     */
    static toPersistence(order: Partial<IOrder>): Record<string, unknown> {
        const data: Record<string, unknown> = {};

        if (order.userId !== undefined) data.user_id = order.userId;
        if (order.storeId !== undefined) data.store_id = order.storeId;
        if (order.status !== undefined) data.status = order.status;
        if (order.paymentStatus !== undefined) data.payment_status = order.paymentStatus;

        // Monetary values - cents only (but also set legacy decimal columns for backward compatibility)
        if (order.subtotalCents !== undefined) {
            data.subtotal_cents = order.subtotalCents;
            data.subtotal = order.subtotalCents / 100; // Legacy column
        }
        if (order.shippingCostCents !== undefined) {
            data.shipping_cost_cents = order.shippingCostCents;
            data.shipping_cost = order.shippingCostCents / 100; // Legacy column
        }
        if (order.discountCents !== undefined) {
            data.discount_cents = order.discountCents;
            data.discount = order.discountCents / 100; // Legacy column
        }
        if (order.totalCents !== undefined) {
            data.total_cents = order.totalCents;
            data.total = order.totalCents / 100; // Legacy column
        }
        if (order.currency !== undefined) data.currency = order.currency;

        // Shipping address
        if (order.shippingAddress !== undefined) {
            data.shipping_address = OrderMapper.addressToPersistence(order.shippingAddress);
        }
        if (order.billingAddress !== undefined) {
            data.billing_address = OrderMapper.addressToPersistence(order.billingAddress);
        }

        // Shipping support
        if (order.shippingActualCostCents !== undefined) data.shipping_actual_cost_cents = order.shippingActualCostCents;
        if (order.shippingCustomerPaidCents !== undefined) data.shipping_customer_paid_cents = order.shippingCustomerPaidCents;
        if (order.shippingStoreCoveredCents !== undefined) data.shipping_store_covered_cents = order.shippingStoreCoveredCents;
        if (order.shippingPlatformCoveredCents !== undefined) data.shipping_platform_covered_cents = order.shippingPlatformCoveredCents;
        if (order.shippingStoreOwesPlatformCents !== undefined) data.shipping_store_owes_platform_cents = order.shippingStoreOwesPlatformCents;
        if (order.shippingRuleId !== undefined) data.shipping_rule_id = order.shippingRuleId;

        // Coupon
        if (order.couponCode !== undefined) data.coupon_code = order.couponCode;
        if (order.couponDiscountCents !== undefined) data.coupon_discount_cents = order.couponDiscountCents;

        // Tracking
        if (order.trackingNumber !== undefined) data.tracking_number = order.trackingNumber;
        if (order.carrier !== undefined) data.carrier = order.carrier;

        // Notes
        if (order.customerNote !== undefined) data.customer_note = order.customerNote;
        if (order.cancellationReason !== undefined) data.cancellation_reason = order.cancellationReason;
        if (order.cancelledAt !== undefined) data.cancelled_at = order.cancelledAt;

        // Idempotency
        if (order.idempotencyKey !== undefined) data.idempotency_key = order.idempotencyKey;

        return data;
    }

    /**
     * Convert domain address to persistence format
     */
    static addressToPersistence(address: IShippingAddress): Record<string, unknown> {
        return {
            full_name: address.fullName,
            phone: address.phone,
            address_line1: address.addressLine1,
            address_line2: address.addressLine2,
            city: address.city,
            district: address.district,
            state: address.state,
            postal_code: address.postalCode,
            country: address.country,
        };
    }
}
