/**
 * Order Controller (TypeScript)
 * Uses new architecture: Repository + Mapper + DTOs + Centralized Errors
 * 
 * Endpoints:
 * - POST /api/v1/orders/v2 - Create order (cents-only input)
 * - PATCH /api/v1/orders/v2/:id/status - Update order status
 */

import { Request, Response, NextFunction } from 'express';
import { getOrderRepository } from '../../infrastructure/repositories/SequelizeOrderRepository';
import { getProductRepository } from '../../infrastructure/repositories/SequelizeProductRepository';
import { OrderDTOMapper, CreateOrderDTO, UpdateOrderStatusDTO } from '../../application/dtos/order.dto';
import { OrderStatus, PaymentStatus, IOrderItem } from '../../domain/types/order.types';
import type { IOrder } from '../../domain/types/order.types';
import {
    ValidationError,
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
    BusinessRuleError,
    StockError,
} from '../../shared/errors';

// Import Store model for seller ownership check
const { Store } = require('../../models');

// Get repository instances
const orderRepo = getOrderRepository();
const productRepo = getProductRepository();

/**
 * Helper: Assert seller can modify order (store ownership check)
 * Admin can modify any order; seller can only modify orders from their own store.
 * @throws ForbiddenError if seller tries to modify another store's order
 */
async function assertSellerCanModifyOrder(
    user: { id: string; role: string },
    order: IOrder
): Promise<void> {
    // Admin can modify any order
    if (user.role === 'admin') {
        return;
    }

    // Seller can only modify orders from their own store
    if (user.role === 'seller') {
        const userStore = await Store.findOne({ where: { user_id: user.id } });

        if (!userStore) {
            throw new ForbiddenError('Seller does not have a store');
        }

        // Check if order belongs to seller's store
        const orderStoreId = (order as any).storeId || (order as any).store_id;
        if (orderStoreId !== userStore.id) {
            throw new ForbiddenError('You can only update orders from your own store');
        }
    }
}

// Reserved for future use: assertCentsInteger
// function assertCentsInteger(value: unknown, fieldName: string): number {
//     if (typeof value !== 'number' || !Number.isInteger(value)) {
//         throw new ValidationError(`${fieldName} must be an integer (cents)`, {
//             field: fieldName,
//             received: typeof value,
//             hint: 'Send monetary values in cents, e.g., 9999 for ₺99.99',
//         });
//     }
//     return value;
// }

/**
 * Create a new order
 * POST /api/v1/orders/v2
 * 
 * Request body (CreateOrderDTO with cents-only money fields):
 * {
 *   storeId: string,
 *   items: [{ productId: string, quantity: number }],
 *   shippingAddress: { fullName, phone, addressLine1, city, postalCode, country },
 *   paymentMethod: 'credit_card' | 'cash_on_delivery',
 *   idempotencyKey?: string
 * }
 */
export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const userId = (req as any).user?.id || null;
        const body: CreateOrderDTO = req.body;

        // Validate required fields
        if (!body.storeId) {
            throw new ValidationError('storeId is required');
        }
        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
            throw new ValidationError('items array is required and must not be empty');
        }
        if (!body.shippingAddress) {
            throw new ValidationError('shippingAddress is required');
        }

        // Check idempotency
        if (body.idempotencyKey) {
            const existing = await orderRepo.findByIdempotencyKey(body.idempotencyKey);
            if (existing) {
                // Return existing order (idempotent)
                const response = OrderDTOMapper.toResponse(existing);
                return res.status(200).json({
                    success: true,
                    message: 'Order already exists (idempotent)',
                    data: response,
                });
            }
        }

        // Fetch products and validate stock
        const productIds = body.items.map(item => item.productId);
        const products = await productRepo.findByIds(productIds);

        if (products.length !== productIds.length) {
            const foundIds = new Set(products.map(p => p.id));
            const missing = productIds.filter(id => !foundIds.has(id));
            throw new NotFoundError('Product', missing[0]);
        }

        // Build order items with cents calculations
        let subtotalCents = 0;
        const orderItems: Omit<IOrderItem, 'id' | 'orderId'>[] = [];

        for (const inputItem of body.items) {
            const product = products.find(p => p.id === inputItem.productId);
            if (!product) continue;

            // Validate stock
            if (product.stock < inputItem.quantity) {
                throw new StockError(
                    `Insufficient stock for ${product.title}`,
                    product.id,
                    product.stock,
                    inputItem.quantity
                );
            }

            // Calculate cents (product.priceCents is source of truth)
            const unitAmountCents = product.priceCents;
            const lineTotalAmountCents = unitAmountCents * inputItem.quantity;
            subtotalCents += lineTotalAmountCents;

            orderItems.push({
                productId: product.id,
                vendorId: product.storeId,
                quantity: inputItem.quantity,
                unitAmountCents,
                lineTotalAmountCents,
                currency: product.currency || 'TRY',
                productSnapshot: {
                    title: product.title,
                    sku: product.sku,
                    imageUrl: product.images[0],
                },
            });
        }

        // Calculate totals (shipping could come from external service)
        const shippingCostCents = 1500; // Default ₺15.00 shipping
        const discountCents = 0;
        const totalCents = subtotalCents + shippingCostCents - discountCents;

        // Build order data
        const orderData: Omit<IOrder, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber'> = {
            userId,
            storeId: body.storeId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            items: orderItems as IOrderItem[],
            subtotalCents,
            shippingCostCents,
            discountCents,
            totalCents,
            currency: 'TRY',
            shippingAddress: OrderDTOMapper.addressToDomain(body.shippingAddress),
            billingAddress: body.billingAddress
                ? OrderDTOMapper.addressToDomain(body.billingAddress)
                : undefined,
            idempotencyKey: body.idempotencyKey,
            customerNote: body.customerNote,
            couponCode: body.couponCode,
        };

        // Create order via repository
        const order = await orderRepo.create(orderData);

        // Decrement stock for each item
        for (const item of body.items) {
            await productRepo.decrementStock(item.productId, item.quantity);
        }

        // Map to response DTO
        const response = OrderDTOMapper.toResponse(order);

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: response,
        });

    } catch (error) {
        next(error);
    }
}

/**
 * Update order status
 * PATCH /api/v1/orders/v2/:id/status
 * 
 * Request body (UpdateOrderStatusDTO):
 * {
 *   status: 'draft' | 'pending' | 'confirmed' | 'cancelled',
 *   cancellationReason?: string
 * }
 */
export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const { id } = req.params;
        const { status, cancellationReason } = req.body as UpdateOrderStatusDTO;
        const user = (req as any).user;

        // Auth check
        if (!user) {
            throw new UnauthorizedError('Authentication required');
        }

        // Validate status value
        if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
            throw new ValidationError('Invalid order status', {
                field: 'status',
                received: status,
                valid: Object.values(OrderStatus),
            });
        }

        // Fetch existing order
        const order = await orderRepo.findById(id);
        if (!order) {
            throw new NotFoundError('Order', id);
        }

        // Authorization check
        const isOwner = order.userId === user.id;
        const isAdmin = user.role === 'admin';
        const isSeller = user.role === 'seller';

        // Define who can do what
        const canConfirm = isAdmin || isSeller;
        const canCancel = isOwner || isAdmin;

        if (status === OrderStatus.CONFIRMED && !canConfirm) {
            throw new ForbiddenError('Only admin or seller can confirm orders');
        }

        if (status === OrderStatus.CANCELLED && !canCancel) {
            throw new ForbiddenError('You are not authorized to cancel this order');
        }

        // Validate state transition using the canonical map from order.types.ts
        const currentStatus = order.status;
        const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

        if (!allowed.includes(status as OrderStatus)) {
            throw new BusinessRuleError(
                `Cannot transition from ${currentStatus} to ${status}`,
                { currentStatus, requestedStatus: status, allowedTransitions: allowed }
            );
        }

        // Update via repository
        const updatedOrder = await orderRepo.updateStatus(
            id,
            status as OrderStatus,
            cancellationReason
        );

        // If cancelled, restore stock
        if (status === OrderStatus.CANCELLED) {
            for (const item of updatedOrder.items) {
                await productRepo.incrementStock(item.productId, item.quantity);
            }
        }

        // Map to response
        const response = OrderDTOMapper.toResponse(updatedOrder);

        return res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: response,
        });

    } catch (error) {
        next(error);
    }
}

/**
 * Get order by ID (using new architecture)
 * GET /api/v1/orders/v2/:id
 */
export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const order = await orderRepo.findById(id);
        if (!order) {
            throw new NotFoundError('Order', id);
        }

        // Authorization: owner, admin, or store seller
        const isOwner = order.userId === user?.id;
        const isAdmin = user?.role === 'admin';

        // Seller can view orders from their own store
        let isStoreSeller = false;
        if (user?.role === 'seller') {
            const userStore = await Store.findOne({ where: { user_id: user.id } });
            const orderStoreId = (order as any).storeId || (order as any).store_id;
            if (userStore && orderStoreId === userStore.id) {
                isStoreSeller = true;
            }
        }

        if (!isOwner && !isAdmin && !isStoreSeller) {
            throw new ForbiddenError('You are not authorized to view this order');
        }

        const response = OrderDTOMapper.toResponse(order);

        return res.status(200).json({
            success: true,
            message: 'Order retrieved successfully',
            data: response,
        });

    } catch (error) {
        next(error);
    }
}

// ==========================================
// PHASE 8.1: FULFILLMENT ENDPOINTS (V2)
// ==========================================

import {
    OrderIdParamSchema,
    UpdateOrderStatusSchema,
    UpdateOrderTrackingSchema,
} from '../schemas/order-fulfillment.schema';
import { ALLOWED_STATUS_TRANSITIONS } from '../../domain/types/order.types';

/**
 * Update order status (V2)
 * PATCH /api/v2/orders/:id/status
 * 
 * - Validates status transition
 * - Admin/seller only (buyer gets 403)
 * - Auto-sets timestamps (shippedAt, deliveredAt, cancelledAt)
 */
export async function updateStatusV2(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        // Validate params
        const paramResult = OrderIdParamSchema.safeParse(req.params);
        if (!paramResult.success) {
            throw new ValidationError('Invalid order ID', { errors: paramResult.error.flatten() });
        }
        const { id } = paramResult.data;

        // Validate body
        const bodyResult = UpdateOrderStatusSchema.safeParse(req.body);
        if (!bodyResult.success) {
            throw new ValidationError('Invalid status', { errors: bodyResult.error.flatten() });
        }
        const { status: newStatusStr } = bodyResult.data;

        // Cast to enum
        const newStatus = newStatusStr.toUpperCase() as keyof typeof OrderStatus;
        const newStatusValue = OrderStatus[newStatus];

        if (!newStatusValue) {
            throw new ValidationError(`Invalid status value: ${newStatusStr}`);
        }

        // Get user and check role
        const user = (req as any).user;
        if (!user) {
            throw new ForbiddenError('Authentication required');
        }

        // Only admin/seller can update status
        if (user.role !== 'admin' && user.role !== 'seller') {
            throw new ForbiddenError('Only admins and sellers can update order status');
        }

        // Get current order
        const order = await orderRepo.findById(id);
        if (!order) {
            throw new NotFoundError('Order', id);
        }

        // Seller can only modify orders from their own store
        await assertSellerCanModifyOrder(user, order);

        // Validate transition
        const currentStatus = order.status;
        const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

        if (!allowedTransitions.includes(newStatusValue)) {
            throw new ValidationError(
                `Invalid status transition: ${currentStatus} → ${newStatusStr}`,
                {
                    currentStatus,
                    requestedStatus: newStatusStr,
                    allowedTransitions: allowedTransitions.map(s => s.toLowerCase())
                }
            );
        }

        // Perform update
        const updatedOrder = await orderRepo.updateStatus(id, newStatusValue);

        return res.status(200).json({
            success: true,
            message: `Order status updated to ${newStatusStr}`,
            data: {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                previousStatus: currentStatus,
                newStatus: newStatusStr,
                updatedAt: updatedOrder.updatedAt?.toISOString(),
                shippedAt: (updatedOrder as any).shippedAt?.toISOString() || null,
                deliveredAt: (updatedOrder as any).deliveredAt?.toISOString() || null,
            },
        });

    } catch (error) {
        next(error);
    }
}

/**
 * Update order tracking info (V2)
 * PATCH /api/v2/orders/:id/tracking
 * 
 * - Only for orders in processing/shipped status
 * - Auto-sets status to shipped if not already
 * - Admin/seller only (buyer gets 403)
 */
export async function updateTracking(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        // Validate params
        const paramResult = OrderIdParamSchema.safeParse(req.params);
        if (!paramResult.success) {
            throw new ValidationError('Invalid order ID', { errors: paramResult.error.flatten() });
        }
        const { id } = paramResult.data;

        // Validate body
        const bodyResult = UpdateOrderTrackingSchema.safeParse(req.body);
        if (!bodyResult.success) {
            throw new ValidationError('Invalid tracking data', { errors: bodyResult.error.flatten() });
        }
        const { carrier, trackingNumber } = bodyResult.data;

        // Get user and check role
        const user = (req as any).user;
        if (!user) {
            throw new ForbiddenError('Authentication required');
        }

        // Only admin/seller can update tracking
        if (user.role !== 'admin' && user.role !== 'seller') {
            throw new ForbiddenError('Only admins and sellers can update tracking info');
        }

        // Get current order
        const order = await orderRepo.findById(id);
        if (!order) {
            throw new NotFoundError('Order', id);
        }

        // Seller can only modify orders from their own store
        await assertSellerCanModifyOrder(user, order);

        // Tracking can only be set for processing/shipped orders
        const allowedForTracking = ['processing', 'shipped'];
        if (!allowedForTracking.includes(order.status)) {
            throw new ValidationError(
                `Tracking can only be set for orders in processing or shipped status`,
                { currentStatus: order.status }
            );
        }

        // Perform update (auto-sets shipped status + shippedAt)
        const updatedOrder = await orderRepo.updateTracking(id, carrier, trackingNumber);

        return res.status(200).json({
            success: true,
            message: 'Tracking info updated',
            data: {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                carrier,
                trackingNumber,
                status: updatedOrder.status,
                shippedAt: (updatedOrder as any).shippedAt?.toISOString() || null,
            },
        });

    } catch (error) {
        next(error);
    }
}
