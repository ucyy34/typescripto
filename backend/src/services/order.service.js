/**
 * Order Service
 * Business logic for order management with FSM (Finite State Machine)
 */

const { Order, OrderItem, Product, Store, User } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const {
  serializeOrderForEvent,
  publishOrderCreated,
  publishOrderPaid,
  publishOrderShipped,
  publishOrderCompleted,
  publishOrderFailed,
} = require('../events/order.events');

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
  static STATE_TRANSITIONS = {
    pending_payment: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled', 'refunded'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: [],
  };

  /**
   * Create new order from cart items
   * @param {string} userId - User ID
   * @param {Object} orderData - Order data with items, shipping address, etc.
   * @returns {Promise<Order>} Created order
   */
  async createOrder(userId, orderData) {
    const { store_id, items, shipping_address, billing_address, payment_method, customer_note } =
      orderData;

    // Validate store
    const store = await Store.findByPk(store_id);
    if (!store) {
      throw new ApiError('Store not found', StatusCodes.NOT_FOUND);
    }

    if (store.status !== 'approved') {
      throw new ApiError('Store is not active', StatusCodes.BAD_REQUEST);
    }

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Validate products and calculate totals
      const { validatedItems, subtotal } = await this.validateOrderItems(items, store_id);

      // Calculate totals
      const shipping_fee = parseFloat(store.settings?.shipping_fee || 0);
      const tax = parseFloat((subtotal * 0.18).toFixed(2)); // 18% VAT
      const discount = 0;
      const total = subtotal + shipping_fee + tax - discount;

      // Generate order number
      const order_number = await this.generateOrderNumber();

      // Create order
      const order = await Order.create(
        {
          order_number,
          user_id: userId,
          store_id,
          status: 'pending_payment',
          payment_status: 'pending',
          payment_method,
          subtotal,
          shipping_fee,
          tax,
          discount,
          total,
          shipping_address,
          billing_address: billing_address || shipping_address,
          customer_note,
        },
        { transaction }
      );

      // Create order items with product snapshots
      for (const item of validatedItems) {
        await OrderItem.create(
          {
            order_id: order.id,
            product_id: item.product.id,
            product_snapshot: {
              title: item.product.title,
              slug: item.product.slug,
              price: parseFloat(item.product.price),
              image: item.product.images?.[0] || null,
              sku: item.product.sku,
            },
            quantity: item.quantity,
            price: parseFloat(item.product.price),
            subtotal: item.total,
            discount: 0,
            tax: 0,
            total: item.total,
          },
          { transaction }
        );

        // Decrease product stock
        await item.product.decrement('stock', { by: item.quantity, transaction });
      }

      await transaction.commit();

      // Return order with items
      return this.getOrderById(order.id, userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Create an order from an enriched cart payload and publish workflow event.
   * @param {string|null} userId
   * @param {Object} cart
   * @param {Object} checkoutInput
   * @returns {Promise<Order>}
   */
  async createFromCart(userId, cart, checkoutInput = {}) {
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new ApiError('Cart is empty', StatusCodes.BAD_REQUEST);
    }

    const normalizedItems = cart.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      store_id: item.store?.id || item.store_id,
      item_total: item.item_total || item.total || null,
    }));

    const invalidItem = normalizedItems.find((item) => !item.store_id);
    if (invalidItem) {
      throw new ApiError('Store information missing for cart item', StatusCodes.BAD_REQUEST);
    }

    const itemsByStore = normalizedItems.reduce((acc, item) => {
      if (!acc.has(item.store_id)) {
        acc.set(item.store_id, {
          items: [],
          subtotal: 0,
          quantity: 0,
        });
      }

      const entry = acc.get(item.store_id);
      entry.items.push({
        product_id: item.product_id,
        quantity: item.quantity,
      });
      entry.quantity += item.quantity;
      if (item.item_total) {
        entry.subtotal += parseFloat(item.item_total);
      }

      return acc;
    }, new Map());

    if (itemsByStore.size === 0) {
      throw new ApiError('Cart items could not be grouped by store', StatusCodes.BAD_REQUEST);
    }

    const shippingAddress = checkoutInput.shipping_address;
    const billingAddress = checkoutInput.billing_address || shippingAddress;
    const paymentMethod = checkoutInput.payment_method || 'manual';
    const customerNote = checkoutInput.customer_note;

    const orders = [];
    for (const [storeId, storePayload] of itemsByStore.entries()) {
      const payload = {
        store_id: storeId,
        items: storePayload.items,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        payment_method: paymentMethod,
        customer_note: customerNote,
      };

      const order = await this.createOrder(userId, payload);

      await publishOrderCreated(
        serializeOrderForEvent(order, {
          cartTotals: {
            subtotal: storePayload.subtotal || parseFloat(order.subtotal) || 0,
            item_count: storePayload.quantity,
          },
          paymentMethod,
        })
      );

      orders.push(order);
    }

    return orders;
  }

  /**
   * Get all orders (admin only)
   * @param {Object} filters
   * @returns {Promise<Object>} Orders with pagination
   */
  async getAllOrders(filters = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      store_id,
      user_id,
      sort = '-created_at',
    } = filters;

    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (store_id) whereClause.store_id = store_id;
    if (user_id) whereClause.user_id = user_id;

    const [sortField, sortOrder] = sort.startsWith('-')
      ? [sort.substring(1), 'DESC']
      : [sort, 'ASC'];

    const { rows: orders, count: total } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Store, as: 'store', attributes: ['id', 'name', 'slug'] },
      ],
      limit,
      offset,
      order: [[sortField, sortOrder]],
    });

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} role - User role
   * @returns {Promise<Order>} Order with items
   */
  async getOrderById(orderId, userId, role = 'buyer') {
    const whereClause = { id: orderId };

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
          attributes: ['id', 'product_id', 'product_snapshot', 'quantity', 'price', 'total'],
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
      throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
    }

    // Sellers can only see orders from their store
    if (role === 'seller') {
      const userStore = await Store.findOne({ where: { user_id: userId } });
      if (!userStore || order.store_id !== userStore.id) {
        throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
      }
    }

    return order;
  }

  /**
   * Get user's orders with pagination
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Orders with pagination
   */
  async getUserOrders(userId, filters = {}) {
    const { page = 1, limit = 20, status, sort = '-created_at' } = filters;
    const offset = (page - 1) * limit;

    const whereClause = { user_id: userId };
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
      limit,
      offset,
      order: [[sortField, sortOrder]],
    });

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get store's orders (for sellers)
   * @param {string} storeId - Store ID
   * @param {string} userId - User ID (store owner)
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Orders with pagination
   */
  async getStoreOrders(storeId, userId, filters = {}) {
    // Verify store ownership
    const store = await Store.findOne({
      where: { id: storeId, user_id: userId },
    });

    if (!store) {
      throw new ApiError('Store not found or access denied', StatusCodes.FORBIDDEN);
    }

    const { page = 1, limit = 20, status, sort = '-created_at' } = filters;
    const offset = (page - 1) * limit;

    const whereClause = { store_id: storeId };
    if (status) {
      whereClause.status = status;
    }

    const [sortField, sortOrder] = sort.startsWith('-')
      ? [sort.substring(1), 'DESC']
      : [sort, 'ASC'];

    const { rows: orders, count: total } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'customer', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
      limit,
      offset,
      order: [[sortField, sortOrder]],
    });

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update order status with FSM validation
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @param {Object} updateData - Status update data
   * @returns {Promise<Order>} Updated order
   */
  async updateOrderStatus(orderId, userId, role, updateData) {
    const { status, tracking_number, carrier, cancellation_reason } = updateData;

    const order = await this.getOrderById(orderId, userId, role);

    // Check if transition is valid
    const validTransitions = OrderService.STATE_TRANSITIONS[order.status] || [];
    if (!validTransitions.includes(status)) {
      throw new ApiError(
        `Cannot transition from ${order.status} to ${status}`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Update order
    order.status = status;

    // Handle specific status changes
    if (status === 'paid') {
      order.payment_status = 'paid';
      order.paid_at = new Date();
    }

    if (status === 'shipped') {
      order.tracking_number = tracking_number;
      order.carrier = carrier;
      order.shipped_at = new Date();
    }

    if (status === 'delivered') {
      order.delivered_at = new Date();
    }

    if (status === 'cancelled') {
      order.cancellation_reason = cancellation_reason;
      order.cancelled_at = new Date();

      // Restore stock
      await this.restoreOrderStock(order.id);
    }

    if (status === 'refunded') {
      order.payment_status = 'refunded';
      order.refunded_at = new Date();

      // Restore stock
      await this.restoreOrderStock(order.id);
    }

    await order.save();

    return this.getOrderById(orderId, userId, role);
  }

  async markOrderPaid(orderId, paymentPayload = {}) {
    const order = await this._loadOrderWithRelations(orderId);

    if (order.status === 'paid') {
      return order;
    }

    order.status = 'paid';
    order.payment_status = 'paid';
    order.paid_at = new Date();

    if (paymentPayload.transactionId) {
      order.payment_transaction_id = paymentPayload.transactionId;
    }

    if (paymentPayload.paymentDetails) {
      order.payment_details = paymentPayload.paymentDetails;
    }

    await order.save();
    await order.reload({ include: ORDER_RELATIONS });

    await publishOrderPaid(
      serializeOrderForEvent(order, {
        transactionId: paymentPayload.transactionId || null,
      })
    );

    await publishOrderCompleted(serializeOrderForEvent(order));

    return order;
  }

  async markOrderShipped(orderId, shipmentPayload = {}) {
    const order = await this._loadOrderWithRelations(orderId);

    if (order.status === 'shipped') {
      return order;
    }

    order.status = 'shipped';
    order.shipped_at = new Date();
    order.tracking_number = shipmentPayload.trackingNumber || shipmentPayload.tracking_number || null;
    order.carrier = shipmentPayload.carrier || null;

    await order.save();
    await order.reload({ include: ORDER_RELATIONS });

    await publishOrderShipped(
      serializeOrderForEvent(order, {
        trackingNumber: order.tracking_number,
        carrier: order.carrier,
      })
    );

    return order;
  }

  async markOrderCompleted(orderId, completionPayload = {}) {
    const order = await this._loadOrderWithRelations(orderId);

    if (order.status === 'delivered') {
      return order;
    }

    order.status = 'delivered';
    order.delivered_at = new Date();

    if (completionPayload.feedback) {
      order.customer_note = [order.customer_note, completionPayload.feedback]
        .filter(Boolean)
        .join('\n');
    }

    await order.save();
    await order.reload({ include: ORDER_RELATIONS });

    await publishOrderCompleted(
      serializeOrderForEvent(order, {
        deliveredAt: order.delivered_at?.toISOString?.() || new Date().toISOString(),
      })
    );

    return order;
  }

  async markOrderFailed(orderId, failurePayload = {}) {
    const order = await this._loadOrderWithRelations(orderId);

    order.status = 'cancelled';
    order.payment_status = 'failed';
    order.cancellation_reason = failurePayload.reason || 'Payment failed';
    order.cancelled_at = new Date();

    await order.save();
    await this.restoreOrderStock(order.id);
    await order.reload({ include: ORDER_RELATIONS });

    await publishOrderFailed(
      serializeOrderForEvent(order, {
        reason: order.cancellation_reason,
      })
    );

    return order;
  }

  async _loadOrderWithRelations(orderId) {
    const order = await Order.findByPk(orderId, { include: ORDER_RELATIONS });

    if (!order) {
      throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
    }

    return order;
  }

  /**
   * Validate order items and calculate totals
   * @param {Array} items - Array of {product_id, quantity}
   * @param {string} storeId - Store ID
   * @returns {Promise<Object>} Validated items and subtotal
   * @private
   */
  async validateOrderItems(items, storeId) {
    if (!items || items.length === 0) {
      throw new ApiError('Order must contain at least one item', StatusCodes.BAD_REQUEST);
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
      throw new ApiError('Some products are not available', StatusCodes.BAD_REQUEST);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.product_id);

      if (product.stock < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.title}. Available: ${product.stock}`,
          StatusCodes.BAD_REQUEST
        );
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        product,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    return {
      validatedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
    };
  }

  /**
   * Generate unique order number
   * @returns {Promise<string>} Order number (e.g., ORD-2025-00001)
   * @private
   */
  async generateOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;

    // Get last order number for this year
    const lastOrder = await Order.findOne({
      where: {
        order_number: {
          [Op.like]: `${prefix}%`,
        },
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
   * @param {string} orderId - Order ID
   * @private
   */
  async restoreOrderStock(orderId) {
    const orderItems = await OrderItem.findAll({
      where: { order_id: orderId },
    });

    for (const item of orderItems) {
      await Product.increment('stock', {
        by: item.quantity,
        where: { id: item.product_id },
      });
    }
  }
}

module.exports = new OrderService();
