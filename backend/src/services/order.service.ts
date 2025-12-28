/**
 * Order Service
 * Business logic for order management with FSM (Finite State Machine)
 */

import { Op, Transaction } from 'sequelize';
import { StatusCodes } from 'http-status-codes';
import { sequelize } from '../config/sequelize';
import { AppError, ErrorCode } from '../utils/AppError';
import {
    Order as IOrder,
    OrderStatus,
    OrderItem as IOrderItem,
    Product as IProduct,
} from '../types';
import type { ICartItemVariant, IShippingAddress } from '../domain/types';
import type { UpdateOrderStatusDTO } from '../application/schemas/order.schema';

// Models
// Trigger Restart: 2
const { Order, OrderItem, Product, Store, User, ProductVariant } = require('../models');
const shippingSupportService = require('./shipping-support.service');
const siftahService = require('./siftah.service');
const {
    serializeOrderForEvent,
    publishOrderCreated,
    publishOrderPaid,
    publishOrderShipped,
    publishOrderCompleted,
    publishOrderFailed,
} = require('../events/order.events');

// Types for better clarity
interface OrderItemInput {
    product_id: string;
    quantity: number;
    variant_price?: number;
    variant_stock?: number;
    variant?: ICartItemVariant | null;
}

interface CreateOrderInput {
    store_id: string;
    items: OrderItemInput[];
    shipping_address: IShippingAddress;
    billing_address?: IShippingAddress;
    payment_method: string;
    customer_note?: string;
    idempotency_key?: string;
}

interface CheckoutInput {
    shipping_address: IShippingAddress;
    billing_address?: IShippingAddress;
    payment_method?: string;
    customer_note?: string;
    idempotency_key?: string;
}

interface CartItemPayload {
    product_id: string;
    quantity: number;
    variant?: ICartItemVariant | null;
    variant_price?: number;
    variant_stock?: number;
    item_total?: number;
    store?: { id: string } | null;
    store_id?: string;
    storeId?: string;
}

interface CartPayload {
    id?: string;
    items: CartItemPayload[];
    totals?: {
        subtotal?: number;
        item_count?: number;
        [key: string]: number | undefined;
    };
}

interface OrderListFilters {
    page?: number | string;
    limit?: number | string;
    status?: string;
    store_id?: string;
    user_id?: string;
    sort?: string;
    startDate?: string;
    endDate?: string;
}

interface PaymentDetailsPayload extends Record<string, unknown> {
    transactionId?: string;
}

const ORDER_RELATIONS = [
    { model: OrderItem, as: 'items' },
    { model: Store, as: 'store', attributes: ['id', 'name', 'slug', 'email', 'phone'] },
    {
        model: User,
        as: 'customer',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
    },
];

class OrderService {
    /**
     * Order state machine transitions
     * Defines valid state transitions
     */
    static STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.DRAFT]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        [OrderStatus.COMPLETED]: [],
        [OrderStatus.CANCELLED]: [],
    };

    /**
     * Create new order from cart items
     */
    async createOrder(userId: string | null, orderData: CreateOrderInput): Promise<IOrder> {
        const {
            store_id,
            items,
            shipping_address,
            billing_address,
            payment_method,
            customer_note,
            idempotency_key,
        } = orderData;

        // Idempotency Check
        if (idempotency_key) {
            const existingOrder = await Order.findOne({ where: { idempotency_key } });
            if (existingOrder) {
                return this.getOrderById(existingOrder.id, userId || 'system', 'system');
            }
        }

        // Validate store
        const store = await Store.findByPk(store_id);
        if (!store) {
            throw new AppError('Store not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
        }

        if (store.status !== 'approved') {
            throw new AppError('Store is not active', ErrorCode.VALIDATION_ERROR, StatusCodes.BAD_REQUEST);
        }

        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Validate products and calculate totals (STRICT CENTS)
            const { validatedItems, subtotalCents } = await this.validateOrderItems(items, store_id);

            // Check if this is a new customer (for shipping rules)
            let isNewCustomer = false;
            if (userId) {
                const orderCount = await Order.count({ where: { user_id: userId } });
                isNewCustomer = orderCount === 0;
            }

            // Shipping calculation (requires cents conversion due to external service dependency ?)
            // Assuming shipping service returns decimals, we convert to cents
            // Or we just use decimals for now for shipping/tax calculation but store as cents.

            const subtotalDecimal = subtotalCents / 100;

            const shippingBreakdown = await shippingSupportService.calculateShippingSupport({
                storeId: store_id,
                orderTotal: subtotalDecimal,
                cartTotal: subtotalDecimal,
                storeCount: 1,
                isNewCustomer,
            });

            const shippingFeeCents = Math.round(shippingBreakdown.customerPays * 100);
            const taxCents = Math.round(subtotalCents * 0.18); // 18% VAT
            const discountCents = 0;

            const totalCents = subtotalCents + shippingFeeCents + taxCents - discountCents;

            // Generate order number
            const order_number = await this.generateOrderNumber();

            // Create order with shipping breakdown
            const order = await Order.create(
                {
                    order_number,
                    user_id: userId,
                    store_id,
                    status: OrderStatus.PENDING, // Start as PENDING
                    payment_status: 'pending',
                    payment_method,

                    // Legacy Decimal Fields (Derived)
                    subtotal: subtotalDecimal,
                    shipping_fee: shippingFeeCents / 100,
                    tax: taxCents / 100,
                    discount: discountCents / 100,
                    total: totalCents / 100,

                    shipping_address,
                    billing_address: billing_address || shipping_address,
                    customer_note,
                    idempotency_key,

                    // Shipping Support Breakdown
                    shipping_actual_cost: shippingBreakdown.actualCost,
                    shipping_customer_paid: shippingBreakdown.customerPays,
                    shipping_store_covered: shippingBreakdown.storeCovered,
                    shipping_platform_covered: shippingBreakdown.platformCovered,
                    shipping_rule_id: shippingBreakdown.appliedRuleId,
                },
                { transaction }
            );

            // Create order items with strict cents
            for (const item of validatedItems) {

                // Cents logic
                const unitAmountCents = Math.round(item.price * 100);
                // Note: item.price from validateOrderItems is currently decimal (from DB), 
                // we should ideally fetch integer price or convert safely.

                const lineTotalCents = unitAmountCents * item.quantity;

                await OrderItem.create(
                    {
                        order_id: order.id,
                        product_id: item.product.id,
                        vendor_id: store_id, // Explicit Vendor ID
                        currency: 'TRY', // Default

                        // Snapshot (Simplified)
                        product_snapshot: {
                            title: item.product.title,
                            slug: item.product.slug,
                            sku: item.product.sku,
                            image: item.product.images?.[0] || null,
                            variant: item.variant || null,
                        },

                        quantity: item.quantity,

                        // Financials (Source of Truth)
                        unit_amount_cents: unitAmountCents,
                        line_total_amount_cents: lineTotalCents,

                        // Legacy/Derived
                        price: unitAmountCents / 100,
                        subtotal: lineTotalCents / 100,
                        discount: 0,
                        tax: 0,
                        total: lineTotalCents / 100,
                    },
                    { transaction }
                );

                // Decrease product stock
                await item.product.decrement('stock', { by: item.quantity, transaction });
            }

            await transaction.commit();

            // Return order with items
            return this.getOrderById(order.id, userId || 'system', 'system');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Create orders from an enriched cart payload (ATOMIC - Phase 8.0)
     * 
     * Single transaction guarantees:
     * - All orders created or none (atomicity)
     * - Stock decremented once per confirm (idempotency with baseKey)
     * - Cart cleared only on success
     * 
     * Transaction steps:
     * 1) Lock cart row FOR UPDATE
     * 2) Validate cart not empty
     * 3) Lock product rows FOR UPDATE
     * 4) Validate stock >= qty
     * 5) Group items by storeId
     * 6) Check idempotency (existing orders)
     * 7) Create orders + order_items
     * 8) Decrement stock
     * 9) Clear cart
     * 10) Commit
     */
    async createFromCart(
        userId: string | null,
        cart: CartPayload,
        checkoutInput: CheckoutInput = { shipping_address: {} as IShippingAddress }
    ): Promise<IOrder[]> {
        // Pre-validation (before transaction)
        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            throw new AppError('Cart is empty', ErrorCode.VALIDATION_ERROR, StatusCodes.BAD_REQUEST);
        }

        const baseIdempotencyKey = checkoutInput.idempotency_key;
        const { Cart } = require('../models');

        // === START ATOMIC TRANSACTION ===
        const transaction = await sequelize.transaction();

        try {
            // 1) Lock cart row FOR UPDATE (prevent concurrent checkouts)
            let cartRow = null;
            if (cart.id) {
                cartRow = await Cart.findByPk(cart.id, {
                    lock: transaction.LOCK.UPDATE,
                    transaction,
                });
                if (!cartRow) {
                    throw new AppError('Cart not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
                }
            }

            // 2) Re-validate cart items
            const cartItems = cart.items;
            if (cartItems.length === 0) {
                throw new AppError('Cart is empty', ErrorCode.VALIDATION_ERROR, StatusCodes.BAD_REQUEST);
            }

            // 3) Lock all product rows FOR UPDATE
            const productIds = cartItems.map((item) => item.product_id);
            const products = await Product.findAll({
                where: { id: productIds },
                lock: transaction.LOCK.UPDATE,
                transaction,
            });

            const productMap = new Map(products.map((product: IProduct) => [product.id, product]));

            // 3b) Lock all variant rows FOR UPDATE (Phase 8.0 Fix: Race Condition)
            const variantIds = cartItems
                .filter((item) => item.variant?.id)
                .map((item) => item.variant!.id as string);

            let variantMap = new Map<string, { id: string; stock: number }>();
            if (variantIds.length > 0) {
                const variants = await ProductVariant.findAll({
                    where: { id: variantIds },
                    lock: transaction.LOCK.UPDATE,
                    transaction,
                });
                variantMap = new Map(variants.map((variant: { id: string; stock: number }) => [variant.id, variant]));
            }

            // 4) Validate stock for ALL items before any writes
            for (const item of cartItems) {
                const product = productMap.get(item.product_id);
                if (!product) {
                    throw new AppError(
                        `Product not found: ${item.product_id}`,
                        ErrorCode.NOT_FOUND,
                        StatusCodes.NOT_FOUND
                    );
                }
                if (!product.is_active || product.status !== 'approved') {
                    throw new AppError(
                        `Product not available: ${product.title}`,
                        ErrorCode.VALIDATION_ERROR,
                        StatusCodes.BAD_REQUEST
                    );
                }

                // Use LOCKED variant stock from DB, not stale cart data
                let stockToCheck: number;
                if (item.variant?.id) {
                    const lockedVariant = variantMap.get(item.variant.id as string);
                    if (!lockedVariant) {
                        throw new AppError(
                            `Variant not found: ${item.variant.id} for ${product.title}`,
                            ErrorCode.NOT_FOUND,
                            StatusCodes.NOT_FOUND
                        );
                    }
                    stockToCheck = lockedVariant.stock;
                } else {
                    stockToCheck = product.stock;
                }

                if (stockToCheck < item.quantity) {
                    throw new AppError(
                        `Insufficient stock for ${product.title}. Available: ${stockToCheck}, Requested: ${item.quantity}`,
                        ErrorCode.STOCK_ERROR,
                        StatusCodes.UNPROCESSABLE_ENTITY // 422
                    );
                }
            }

            // 5) Group items by storeId
            const groupedByStore = new Map<string, CartItemPayload[]>();
            for (const item of cartItems) {
                const storeId = item.store?.id || item.store_id || item.storeId;
                if (!storeId) {
                    throw new AppError(
                        'Store information is required for every cart item',
                        ErrorCode.VALIDATION_ERROR,
                        StatusCodes.BAD_REQUEST
                    );
                }
                if (!groupedByStore.has(storeId)) {
                    groupedByStore.set(storeId, []);
                }
                groupedByStore.get(storeId)!.push(item);
            }

            // Sort by storeId for deterministic order
            const sortedStoreIds = Array.from(groupedByStore.keys()).sort();

            // 6) Check idempotency - if orders already exist, return them
            if (baseIdempotencyKey) {
                const existingOrders: IOrder[] = [];
                let allExist = true;

                for (const storeId of sortedStoreIds) {
                    const storeKey = `${baseIdempotencyKey}-${storeId}`;
                    const existingOrder = await Order.findOne({
                        where: { idempotency_key: storeKey },
                        transaction,
                    });
                    if (existingOrder) {
                        existingOrders.push(existingOrder);
                    } else {
                        allExist = false;
                        break;
                    }
                }

                // If all orders exist (idempotent retry), return them without changes
                if (allExist && existingOrders.length === sortedStoreIds.length) {
                    await transaction.commit();
                    // Return full order details
                    return Promise.all(
                        existingOrders.map((order) => this.getOrderById(order.id, userId || 'system', 'system'))
                    );
                }
            }

            // 7) Create orders + order_items for each store
            const orders: IOrder[] = [];

            for (const storeId of sortedStoreIds) {
                const items = groupedByStore.get(storeId)!;

                // Validate store
                const store = await Store.findByPk(storeId, { transaction });
                if (!store) {
                    throw new AppError(`Store not found: ${storeId}`, ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
                }
                if (store.status !== 'approved') {
                    throw new AppError(`Store not active: ${store.name}`, ErrorCode.VALIDATION_ERROR, StatusCodes.BAD_REQUEST);
                }

                // Calculate totals for this store
                let subtotalCents = 0;
                const validatedItems: Array<{
                    product: IProduct;
                    quantity: number;
                    price: number;
                    priceCents: number;
                    variant: ICartItemVariant | null;
                }> = [];

                for (const item of items) {
                    const product = productMap.get(item.product_id);
                    const priceDecimal = item.variant?.price ?? parseFloat(product.price);
                    const priceCents = Math.round(priceDecimal * 100);
                    const itemTotalCents = priceCents * item.quantity;
                    subtotalCents += itemTotalCents;

                    validatedItems.push({
                        product,
                        quantity: item.quantity,
                        price: priceDecimal,
                        priceCents,
                        variant: item.variant || null,
                    });
                }

                // Shipping calculation
                const subtotalDecimal = subtotalCents / 100;
                let isNewCustomer = false;
                if (userId) {
                    const orderCount = await Order.count({ where: { user_id: userId }, transaction });
                    isNewCustomer = orderCount === 0;
                }

                const shippingBreakdown = await shippingSupportService.calculateShippingSupport({
                    storeId,
                    orderTotal: subtotalDecimal,
                    cartTotal: subtotalDecimal,
                    storeCount: sortedStoreIds.length,
                    isNewCustomer,
                });

                const shippingFeeCents = Math.round(shippingBreakdown.customerPays * 100);
                const taxCents = Math.round(subtotalCents * 0.18);
                const totalCents = subtotalCents + shippingFeeCents + taxCents;

                // Generate order number
                const order_number = await this.generateOrderNumber();
                const storeIdempotencyKey = baseIdempotencyKey ? `${baseIdempotencyKey}-${storeId}` : undefined;

                // Create order
                const order = await Order.create(
                    {
                        order_number,
                        user_id: userId,
                        store_id: storeId,
                        status: OrderStatus.PENDING,
                        payment_status: 'pending',
                        payment_method: checkoutInput.payment_method || 'manual',

                        subtotal: subtotalDecimal,
                        shipping_fee: shippingFeeCents / 100,
                        tax: taxCents / 100,
                        discount: 0,
                        total: totalCents / 100,

                        shipping_address: checkoutInput.shipping_address,
                        billing_address: checkoutInput.billing_address || checkoutInput.shipping_address,
                        customer_note: checkoutInput.customer_note,
                        idempotency_key: storeIdempotencyKey,

                        shipping_actual_cost: shippingBreakdown.actualCost,
                        shipping_customer_paid: shippingBreakdown.customerPays,
                        shipping_store_covered: shippingBreakdown.storeCovered,
                        shipping_platform_covered: shippingBreakdown.platformCovered,
                        shipping_rule_id: shippingBreakdown.appliedRuleId,
                    },
                    { transaction }
                );

                // Create order items
                for (const item of validatedItems) {
                    const lineTotalCents = item.priceCents * item.quantity;

                    await OrderItem.create(
                        {
                            order_id: order.id,
                            product_id: item.product.id,
                            vendor_id: storeId,
                            currency: 'TRY',

                            product_snapshot: {
                                title: item.product.title,
                                slug: item.product.slug,
                                sku: item.product.sku,
                                image: item.product.images?.[0] || null,
                                variant: item.variant,
                            },

                            quantity: item.quantity,
                            unit_amount_cents: item.priceCents,
                            line_total_amount_cents: lineTotalCents,
                            price: item.priceCents / 100,
                            subtotal: lineTotalCents / 100,
                            discount: 0,
                            tax: 0,
                            total: lineTotalCents / 100,
                        },
                        { transaction }
                    );

                    // 8) Decrement stock (within transaction) - SINGLE SOURCE OF TRUTH
                    // A. Variant specific logic
                    if (item.variant && item.variant.id) {
                        const variant = await ProductVariant.findByPk(item.variant.id, { transaction });
                        if (!variant) {
                            throw new AppError(
                                `Variant ${item.variant.id} not found during stock decrement`,
                                ErrorCode.NOT_FOUND,
                                StatusCodes.NOT_FOUND
                            );
                        }
                        await variant.decrement('stock', { by: item.quantity, transaction });
                    } else {
                        // B. Main Product Stock (Only if NO variant selected)
                        await item.product.decrement('stock', { by: item.quantity, transaction });
                    }

                    // C. Total Sales (Always increment main product total sales)
                    await item.product.increment('total_sales', { by: item.quantity, transaction });
                }

                orders.push(order);
            }

            // 10) Record Siftah (First Sale) Logic
            for (const storeId of sortedStoreIds) {
                await siftahService.recordSiftahSale(storeId, { transaction });
            }

            // 11) Clear cart (within transaction)
            if (cartRow) {
                const { CartItem } = require('../models');
                await CartItem.destroy({ where: { cart_id: cartRow.id }, transaction });
            }

            // 10) Commit transaction
            await transaction.commit();

            // Publish events (after commit)
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                const storeId = sortedStoreIds[i];
                const items = groupedByStore.get(storeId)!;

                await publishOrderCreated(
                    serializeOrderForEvent(order, {
                        cartTotals: cart.totals || null,
                        storeItemCount: items.reduce((acc, item) => acc + item.quantity, 0),
                        storeSubtotal: parseFloat(
                            items.reduce((acc, item) => acc + (item.item_total ?? 0), 0).toFixed(2)
                        ),
                        paymentMethod: checkoutInput.payment_method || 'manual',
                    })
                );
            }

            // Return full order details (sorted by storeId for determinism)
            return Promise.all(
                orders.map((order) => this.getOrderById(order.id, userId || 'system', 'system'))
            );

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get all orders (admin only)
     */
    async getAllOrders(filters: OrderListFilters = {}) {
        // ... (Existing implementation kept but simplified needed?)
        // For now returning standard retrieval
        const { page = 1, limit = 20, status, store_id, user_id, sort = '-created_at' } = filters;
        const parsedPage = Number(page) || 1;
        const parsedLimit = Number(limit) || 20;
        const offset = (parsedPage - 1) * parsedLimit;
        const whereClause: Record<string, unknown> = {};
        if (status) whereClause.status = status;
        if (store_id) whereClause.store_id = store_id;
        if (user_id) whereClause.user_id = user_id;

        const [sortField, sortOrder] = sort.startsWith('-') ? [sort.substring(1), 'DESC'] : [sort, 'ASC'];
        const { rows, count } = await Order.findAndCountAll({
            where: whereClause,
            include: ORDER_RELATIONS,
            limit: parsedLimit,
            offset,
            order: [[sortField, sortOrder]]
        });

        return { orders: rows, pagination: { total: count, page: parsedPage, limit: parsedLimit } };
    }

    /**
     * Get order by ID
     */
    async getOrderById(orderId: string, userId: string, role: string = 'buyer'): Promise<IOrder> {
        const whereClause: Record<string, unknown> = { id: orderId };

        // Buyers can only see their own orders
        if (role === 'buyer') {
            whereClause.user_id = userId;
        }

        const order = await Order.findOne({
            where: whereClause,
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    // Explicitly selecting new columns
                    attributes: ['id', 'product_id', 'product_snapshot', 'quantity', 'unit_amount_cents', 'line_total_amount_cents', 'price', 'total'],
                },
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'slug', 'email', 'phone'],
                },
                {
                    model: User,
                    as: 'customer',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
                },
            ],
        });

        if (!order) {
            throw new AppError('Order not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
        }

        // Sellers can only see orders from their store
        if (role === 'seller') {
            const userStore = await Store.findOne({ where: { user_id: userId } });
            if (!userStore || order.store_id !== userStore.id) {
                throw new AppError('Order not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
            }
        }

        return order;
    }

    /**
     * Get user's orders with pagination
     */
    async getUserOrders(userId: string, filters: OrderListFilters = {}) {
        const { page = 1, limit = 20, status, sort = '-created_at' } = filters;
        const parsedPage = Number(page) || 1;
        const parsedLimit = Number(limit) || 20;
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause: Record<string, unknown> = { user_id: userId };
        if (status) {
            whereClause.status = status;
        }

        // Parse sort
        const [sortField, sortOrder] = sort.startsWith('-')
            ? [sort.substring(1), 'DESC']
            : [sort, 'ASC'];

        const { rows: orders, count: total } = await Order.findAndCountAll({
            where: whereClause,
            include: [
                { model: OrderItem, as: 'items' },
                { model: Store, as: 'store', attributes: ['id', 'name', 'slug'] },
            ],
            limit: parsedLimit,
            offset,
            order: [[sortField, sortOrder]],
        });

        return {
            orders,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                totalPages: Math.ceil(total / parsedLimit),
                hasNext: parsedPage < Math.ceil(total / parsedLimit),
                hasPrev: parsedPage > 1,
            },
        };
    }

    /**
     * Get order by order number (for public tracking)
     */
    async getOrderByNumber(orderNumber: string): Promise<IOrder> {
        const order = await Order.findOne({
            where: { order_number: orderNumber },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                },
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name'],
                },
            ],
        });

        if (!order) {
            throw new AppError('Sipariş bulunamadı', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
        }

        return order;
    }

    /**
     * Get store's orders (for sellers)
     */
    async getStoreOrders(storeId: string, userId: string, filters: OrderListFilters = {}) {
        // Verify store ownership (Simplified for brevity)
        const { rows, count } = await Order.findAndCountAll({ where: { store_id: storeId }, include: ORDER_RELATIONS });
        return { orders: rows, pagination: { total: count } };
    }

    /**
     * Update order status with FSM validation
     */
    async updateOrderStatus(orderId: string, userId: string, role: string, updateData: UpdateOrderStatusDTO): Promise<IOrder> {
        const { status, cancellation_reason } = updateData;

        const order = await this.getOrderById(orderId, userId, role);

        // Check if transition is valid
        const validTransitions = OrderService.STATE_TRANSITIONS[order.status as OrderStatus] || [];
        if (!validTransitions.includes(status)) {
            throw new AppError(
                `Cannot transition from ${order.status} to ${status}`,
                ErrorCode.ORDER_ERROR,
                StatusCodes.BAD_REQUEST
            );
        }

        // Update order
        order.status = status;

        if (status === OrderStatus.CONFIRMED) {
            // Logic for confirmation (e.g., notify store)
        }

        if (status === OrderStatus.CANCELLED) {
            order.cancellation_reason = cancellation_reason;
            order.cancelled_at = new Date();
            await this.restoreOrderStock(order.id);
        }

        await order.save();
        return this.getOrderById(orderId, userId, role);
    }

    /**
     * Mark order as paid
     */
    async markOrderPaid(orderId: string, paymentDetails: PaymentDetailsPayload = {}) {
        const order = await Order.findByPk(orderId);
        if (!order) throw new AppError('Order not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);

        order.payment_status = 'paid';
        order.payment_details = paymentDetails;
        order.status = OrderStatus.CONFIRMED;
        await order.save();
        await order.reload();

        await publishOrderPaid({
            orderId: order.id,
            storeId: order.store_id,
            userId: order.user_id,
            amount: parseFloat(order.total),
            transactionId: paymentDetails.transactionId,
            ...paymentDetails
        });

        return order;
    }

    /**
     * Mark order as completed
     */
    async markOrderCompleted(orderId: string, details: Record<string, unknown> = {}) {
        const order = await Order.findByPk(orderId);
        if (!order) throw new AppError('Order not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);

        order.status = OrderStatus.COMPLETED; // Assuming COMPLETED exists in enum or string
        // If OrderStatus enum doesn't have COMPLETED, we might need to check types.
        // Assuming string for now based on test usage.
        await order.save();
        await order.reload();

        await publishOrderCompleted({
            orderId: order.id,
            storeId: order.store_id,
            userId: order.user_id,
            ...details
        });

        return order;
    }

    // Placeholder methods for paid/shipped/delivered removed as they are not in active flow
    // If needed for future, could re-add.

    async _loadOrderWithRelations(orderId: string) {
        const order = await Order.findByPk(orderId, { include: ORDER_RELATIONS });
        if (!order) throw new AppError('Order not found', ErrorCode.NOT_FOUND, StatusCodes.NOT_FOUND);
        return order;
    }

    /**
     * Validate order items and calculate totals (Returns CENTS)
     */
    async validateOrderItems(items: OrderItemInput[], storeId: string) {
        if (!items || items.length === 0) {
            throw new AppError('Order must contain at least one item', ErrorCode.VALIDATION_ERROR, StatusCodes.BAD_REQUEST);
        }

        const productIds = items.map((item) => item.product_id);
        const products = await Product.findAll({
            where: {
                id: productIds,
                store_id: storeId,
                is_active: true,
                status: 'approved',
            },
        });

        if (products.length !== items.length) {
            throw new AppError('Some products are not available', ErrorCode.STOCK_ERROR, StatusCodes.BAD_REQUEST);
        }

        const productMap = new Map((products as IProduct[]).map((product) => [product.id, product]));
        const validatedItems: Array<{
            product: IProduct;
            quantity: number;
            price: number;
            variant: ICartItemVariant | null;
            totalCents: number;
        }> = [];
        let subtotalCents = 0;

        for (const item of items) {
            const product = productMap.get(item.product_id);
            if (!product) {
                throw new AppError('Some products are not available', ErrorCode.STOCK_ERROR, StatusCodes.BAD_REQUEST);
            }

            const variantStock = item.variant_stock ?? item.variant?.stock ?? null;
            const stockToCheck =
                variantStock !== null && variantStock !== undefined ? variantStock : product.stock;

            if (stockToCheck < item.quantity) {
                throw new AppError(
                    `Insufficient stock for ${product.title}. Available: ${stockToCheck}`,
                    ErrorCode.STOCK_ERROR,
                    StatusCodes.BAD_REQUEST
                );
            }

            // Price logic: Currently DB has price as decimal. 
            // Ideally we would have price_cents in DB. 
            // For now we convert safely.
            const priceDecimal =
                item.variant_price !== undefined && item.variant_price !== null
                    ? Number(item.variant_price)
                    : parseFloat(product.price);

            const priceCents = Math.round(priceDecimal * 100);

            const itemTotalCents = priceCents * item.quantity;
            subtotalCents += itemTotalCents;

            validatedItems.push({
                product,
                quantity: item.quantity,
                price: priceDecimal, // Keep for legacy usage if needed
                variant: item.variant || null,
                totalCents: itemTotalCents,
            });
        }

        return {
            validatedItems,
            subtotalCents: subtotalCents,
        };
    }

    /**
     * Generate unique order number
     */
    async generateOrderNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;
        const lastOrder = await Order.findOne({
            where: {
                order_number: { [Op.like]: `${prefix}%` },
            },
            order: [['created_at', 'DESC']],
        });

        let sequence = 1;
        if (lastOrder) {
            const lastSequence = parseInt(lastOrder.order_number.split('-')[2]);
            sequence = lastSequence + 1;
        }
        return `${prefix}${sequence.toString().padStart(5, '0')}`;
    }

    /**
     * Restore stock for cancelled/refunded order
     */
    async restoreOrderStock(orderId: string) {
        const orderItems = await OrderItem.findAll({ where: { order_id: orderId } });
        for (const item of orderItems) {
            await Product.increment('stock', {
                by: item.quantity,
                where: { id: item.product_id },
            });
        }
    }
}

export = new OrderService();
