/**
 * Order DTOs (Data Transfer Objects)
 * Type-safe API contract for Order operations
 * 
 * Convention:
 * - *DTO = Input (request body)
 * - *ResponseDTO = Output (response body)
 * - All monetary values in cents internally, converted to decimal for responses
 */

import { IOrder, IOrderItem, OrderStatus, PaymentStatus } from '../../domain/types/order.types';
import { IShippingAddress } from '../../domain/types/common.types';

// ============================================
// INPUT DTOs
// ============================================

/**
 * Create order request body
 */
export interface CreateOrderDTO {
    storeId: string;
    items: CreateOrderItemDTO[];
    shippingAddress: ShippingAddressDTO;
    billingAddress?: ShippingAddressDTO;
    paymentMethod: 'credit_card' | 'cash_on_delivery' | 'bank_transfer';
    customerNote?: string;
    idempotencyKey?: string;
    couponCode?: string;
}

/**
 * Order item in create request
 */
export interface CreateOrderItemDTO {
    productId: string;
    quantity: number;
    variantId?: string;
    variantPrice?: number; // Decimal from frontend, will be converted to cents
}

/**
 * Shipping address in request
 */
export interface ShippingAddressDTO {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    district?: string;
    state?: string;
    postalCode: string;
    country?: string;
}

/**
 * Update order status request
 */
export interface UpdateOrderStatusDTO {
    status: OrderStatus;
    cancellationReason?: string;
    trackingNumber?: string;
    carrier?: string;
}

// ============================================
// OUTPUT DTOs
// ============================================

/**
 * Order response (for API output)
 * Monetary values converted to decimal for display
 */
export interface OrderResponseDTO {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;

    // Items
    items: OrderItemResponseDTO[];

    // Monetary values (decimal for display)
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    currency: string;

    // Addresses
    shippingAddress: ShippingAddressDTO;
    billingAddress?: ShippingAddressDTO;

    // Tracking
    trackingNumber?: string;
    carrier?: string;

    // Notes
    customerNote?: string;
    cancellationReason?: string;

    // Timestamps
    createdAt: string;
    updatedAt: string;
    cancelledAt?: string;
}

/**
 * Order item in response
 */
export interface OrderItemResponseDTO {
    id: string;
    productId: string;
    productTitle: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;   // Decimal for display
    lineTotal: number;   // Decimal for display
    currency: string;
}

/**
 * Brief order info for list views
 */
export interface OrderSummaryDTO {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    itemCount: number;
    total: number;
    currency: string;
    createdAt: string;
}

// ============================================
// MAPPER
// ============================================

/**
 * Maps between domain IOrder and DTOs
 * RULE: Cents are source of truth. Decimal output is derived.
 */
export class OrderDTOMapper {
    /**
     * Safely format date to ISO string
     */
    private static formatDate(date: Date | string | undefined): string {
        if (!date) return new Date().toISOString();
        if (typeof date === 'string') return date;
        const d = date instanceof Date ? date : new Date(date);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }

    /**
     * Convert domain order to API response
     */
    static toResponse(order: IOrder): OrderResponseDTO {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,

            items: order.items.map(OrderDTOMapper.itemToResponse),

            // Convert cents to decimal for display
            subtotal: order.subtotalCents / 100,
            shippingCost: order.shippingCostCents / 100,
            discount: order.discountCents / 100,
            total: order.totalCents / 100,
            currency: order.currency,

            shippingAddress: OrderDTOMapper.addressToDTO(order.shippingAddress),
            billingAddress: order.billingAddress
                ? OrderDTOMapper.addressToDTO(order.billingAddress)
                : undefined,

            trackingNumber: order.trackingNumber,
            carrier: order.carrier,
            customerNote: order.customerNote,
            cancellationReason: order.cancellationReason,

            createdAt: OrderDTOMapper.formatDate(order.createdAt as Date | string),
            updatedAt: OrderDTOMapper.formatDate(order.updatedAt as Date | string),
            cancelledAt: order.cancelledAt
                ? OrderDTOMapper.formatDate(order.cancelledAt as Date | string)
                : undefined,
        };
    }

    /**
     * Convert domain order item to response DTO
     */
    static itemToResponse(item: IOrderItem): OrderItemResponseDTO {
        return {
            id: item.id,
            productId: item.productId,
            productTitle: item.productSnapshot.title,
            productImage: item.productSnapshot.imageUrl,
            quantity: item.quantity,
            unitPrice: item.unitAmountCents / 100,
            lineTotal: item.lineTotalAmountCents / 100,
            currency: item.currency,
        };
    }

    /**
     * Convert domain address to DTO
     */
    static addressToDTO(address: IShippingAddress): ShippingAddressDTO {
        return {
            fullName: address.fullName,
            phone: address.phone,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            district: address.district,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
        };
    }

    /**
     * Convert DTO address to domain format
     */
    static addressToDomain(dto: ShippingAddressDTO): IShippingAddress {
        return {
            fullName: dto.fullName,
            phone: dto.phone,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            city: dto.city,
            district: dto.district,
            state: dto.state,
            postalCode: dto.postalCode,
            country: dto.country || 'Turkey',
        };
    }

    /**
     * Convert domain order to summary (for list views)
     */
    static toSummary(order: IOrder): OrderSummaryDTO {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
            total: order.totalCents / 100,
            currency: order.currency,
            createdAt: order.createdAt.toISOString(),
        };
    }
}
