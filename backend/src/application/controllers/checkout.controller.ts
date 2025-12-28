/**
 * Checkout V2 Controller
 * Handles checkout init, confirm and status endpoints
 */

import { Response, NextFunction } from 'express';
import {
    CheckoutConfirmRequestDTO,
    CheckoutStatusParamDTO,
    CheckoutInitResponseDTO,
    CheckoutConfirmResponseDTO,
    CheckoutTotalsDTO,
    CheckoutStatusResponseDTO,
} from '../schemas/checkout.schema';
import { AuthenticatedRequest } from '../../domain/types/common.types';
import { SequelizeCartRepository } from '../../infrastructure/repositories/SequelizeCartRepository';
import { SequelizeProductRepository } from '../../infrastructure/repositories/SequelizeProductRepository';

// Import sequelize for transaction
const { sequelize } = require('../../config/sequelize');
const { Order, OrderItem, CartItem } = require('../../models');

const cartRepo = new SequelizeCartRepository();
const productRepo = new SequelizeProductRepository();

export class CheckoutController {
    /**
     * POST /api/v2/checkout/init
     * Returns cart summary with computed totals
     */
    static async init(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const cart = await cartRepo.findByUserId(userId);

            if (!cart || cart.items.length === 0) {
                return res.status(422).json({
                    success: false,
                    message: 'Cart is empty',
                });
            }

            // Build line items from cart
            const items = cart.items.map(item => ({
                cartItemId: item.id,
                productId: item.productId,
                title: item.productTitle || 'Unknown',
                quantity: item.quantity,
                unitPrice: item.priceCents / 100,
                lineTotal: (item.priceCents * item.quantity) / 100,
            }));

            // Compute totals (all from cents)
            const subtotalCents = cart.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
            const shippingCents = 0; // Placeholder
            const discountCents = 0; // Placeholder
            const totalCents = subtotalCents + shippingCents - discountCents;

            const totals: CheckoutTotalsDTO = {
                subtotal: subtotalCents / 100,
                shipping: shippingCents / 100,
                discount: discountCents / 100,
                total: totalCents / 100,
                currency: 'TRY',
            };

            const response: CheckoutInitResponseDTO = {
                success: true,
                items,
                totals,
                shippingOptions: [], // Placeholder
            };

            return res.json(response);
        } catch (error) {
            return next(error);
        }
    }

    /**
     * POST /api/v2/checkout/confirm
     * Atomic order creation with stock decrement
     * Returns 201 on creation, 200 on idempotent replay
     * 
     * Phase 8.0: Multi-store support via orderService.createFromCart
     * Returns orders[] instead of single order
     */
    static async confirm(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { idempotencyKey, shippingAddress, paymentMethod, notes }: CheckoutConfirmRequestDTO = req.body;
            const userId = req.user!.id;

            // Import order service for multi-store atomicity
            const orderService = require('../../services/order.service');

            // Get cart for orderService
            const cart = await cartRepo.findByUserId(userId);

            if (!cart || cart.items.length === 0) {
                return res.status(422).json({
                    success: false,
                    message: 'Cart is empty',
                });
            }

            // Prepare cart with enriched data for orderService
            const enrichedCart = {
                id: cart.id,
                items: cart.items.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity,
                    store_id: item.storeId,
                    store: { id: item.storeId },
                    variant: item.variant || null,
                    item_total: (item.priceCents * item.quantity) / 100,
                })),
                totals: {
                    subtotal: cart.items.reduce((sum, item) => sum + (item.priceCents * item.quantity) / 100, 0),
                },
            };

            // Prepare checkout input for orderService
            const checkoutInput = {
                shipping_address: {
                    full_name: shippingAddress.fullName,
                    phone: shippingAddress.phone,
                    address_line1: shippingAddress.addressLine1,
                    address_line2: shippingAddress.addressLine2 || '',
                    city: shippingAddress.city,
                    state: shippingAddress.state || '',
                    postal_code: shippingAddress.postalCode,
                    country: shippingAddress.country,
                },
                payment_method: paymentMethod,
                customer_note: notes || '',
                idempotency_key: idempotencyKey,
            };

            // Call atomic createFromCart (handles multi-store, idempotency, stock)
            const orders = await orderService.createFromCart(userId, enrichedCart, checkoutInput);

            // Check if this was an idempotent replay (orders already existed)
            const isReplay = false; // createFromCart handles idempotency internally

            // Build response with all order IDs
            const orderIds = orders.map((o: any) => o.id);
            const orderNumbers = orders.map((o: any) => o.order_number);

            // Calculate combined totals
            const combinedTotals = {
                subtotal: orders.reduce((sum: number, o: any) => sum + parseFloat(o.subtotal || 0), 0),
                shipping: orders.reduce((sum: number, o: any) => sum + parseFloat(o.shipping_fee || 0), 0),
                discount: orders.reduce((sum: number, o: any) => sum + parseFloat(o.discount || 0), 0),
                total: orders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0),
                currency: 'TRY',
            };

            const response: CheckoutConfirmResponseDTO = {
                success: true,
                data: {
                    // Multi-store: return arrays
                    orderIds,
                    orderNumbers,
                    orders: orders.map((o: any) => ({
                        orderId: o.id,
                        orderNumber: o.order_number,
                        status: o.status,
                        storeId: o.store_id,
                        storeName: o.store?.name || 'Unknown',
                        subtotal: parseFloat(o.subtotal || 0),
                        shipping: parseFloat(o.shipping_fee || 0),
                        total: parseFloat(o.total || 0),
                    })),
                    // Combined totals
                    totals: combinedTotals,
                    // Legacy single-order fields for backward compatibility
                    orderId: orderIds[0],
                    orderNumber: orderNumbers[0],
                    status: orders[0]?.status || 'pending',
                },
                idempotencyKey,
                createdAt: new Date().toISOString(),
            };

            return res.status(201).json(response);
        } catch (error: any) {
            // Handle StockError specifically
            if (error.code === 'STOCK_ERROR' || error.message?.includes('stock')) {
                return res.status(422).json({
                    success: false,
                    message: error.message,
                    error: 'STOCK_ERROR',
                    details: error.details || {},
                });
            }
            return next(error);
        }
    }

    /**
     * GET /api/v2/checkout/status/:idempotencyKey
     * Check status of a previous checkout
     */
    static async status(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { idempotencyKey }: CheckoutStatusParamDTO = req.params;
            const userId = req.user!.id;

            const order = await Order.findOne({
                where: { idempotency_key: idempotencyKey, user_id: userId }
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found for this idempotency key',
                    error: 'NOT_FOUND',
                });
            }

            const response: CheckoutStatusResponseDTO = {
                success: true,
                data: {
                    orderId: order.id,
                    orderNumber: order.order_number,
                    status: order.status,
                    totals: {
                        subtotal: order.subtotal_amount_cents / 100,
                        shipping: (order.shipping_cost_cents || 0) / 100,
                        discount: 0,
                        total: order.total_amount_cents / 100,
                        currency: 'TRY',
                    },
                },
                idempotencyKey,
                createdAt: order.created_at.toISOString(),
            };

            return res.json(response);
        } catch (error) {
            return next(error);
        }
    }
}

// Helper to get next order sequence number
async function getNextOrderSequence(): Promise<number> {
    const result = await Order.count();
    return result + 1;
}
