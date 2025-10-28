/**
 * Order Controller
 * Handles order operations with FSM state management
 */

const orderService = require('../services/order.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class OrderController {
  /**
   * Create new order
   * @route POST /api/v1/orders
   * @note Supports both authenticated and guest users
   */
  createOrder = asyncHandler(async (req, res) => {
    // Support guest checkout - user might be null
    const userId = req.user ? req.user.id : null;
    const order = await orderService.createOrder(userId, req.body);
    return success(res, order, 'Order created successfully', 201);
  });

  /**
   * Get user's orders
   * @route GET /api/v1/orders
   */
  getUserOrders = asyncHandler(async (req, res) => {
    const { orders, pagination } = await orderService.getUserOrders(req.user.id, req.query);
    return paginated(res, orders, pagination, 'Orders retrieved successfully');
  });

  /**
   * Get order by ID
   * @route GET /api/v1/orders/:id
   */
  getOrder = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(req.params.id, req.user.id, req.user.role);
    return success(res, order, 'Order retrieved successfully');
  });

  markPaid = asyncHandler(async (req, res) => {
    const order = await orderService.markOrderPaid(req.params.id, {
      transactionId: req.body.transaction_id,
      details: req.body.details,
    });
    return success(res, order, 'Order marked as paid');
  });

  markShipped = asyncHandler(async (req, res) => {
    const order = await orderService.markOrderShipped(req.params.id, {
      trackingNumber: req.body.tracking_number,
      carrier: req.body.carrier,
      shippedAt: req.body.shipped_at,
    });
    return success(res, order, 'Order marked as shipped');
  });

  markCompleted = asyncHandler(async (req, res) => {
    const order = await orderService.markOrderCompleted(req.params.id, {
      deliveredAt: req.body.delivered_at ? new Date(req.body.delivered_at) : undefined,
    });
    return success(res, order, 'Order marked as completed');
  });

  markFailed = asyncHandler(async (req, res) => {
    const order = await orderService.markOrderFailed(req.params.id, {
      reason: req.body.reason,
    });
    return success(res, order, 'Order marked as failed');
  });

  /**
   * Update order status
   * @route PATCH /api/v1/orders/:id/status
   */
  updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body
    );
    return success(res, order, `Order status updated to ${req.body.status}`);
  });

  markPaid = asyncHandler(async (req, res) => {
    const order = await orderService.markOrderPaid(req.params.id, {
      transactionId: req.body.transaction_id,
      paymentDetails: req.body.payment_details,
    });
    return success(res, order, 'Order marked as paid');
  });

  markShipped = asyncHandler(async (req, res) => {
    const order = await orderService.markOrderShipped(req.params.id, {
      trackingNumber: req.body.tracking_number,
      carrier: req.body.carrier,
    });
    return success(res, order, 'Order marked as shipped');
  });

  markCompleted = asyncHandler(async (req, res) => {
    const order = await orderService.markOrderCompleted(req.params.id);
    return success(res, order, 'Order marked as completed');
  });

  /**
   * Get all orders (admin)
   * @route GET /api/v1/orders/admin
   */
  getAllOrders = asyncHandler(async (req, res) => {
    const { orders, pagination } = await orderService.getAllOrders(req.query);
    return paginated(res, orders, pagination, 'All orders retrieved successfully');
  });

  /**
   * Get store's orders (seller only)
   * @route GET /api/v1/stores/:storeId/orders
   */
  getStoreOrders = asyncHandler(async (req, res) => {
    const { orders, pagination } = await orderService.getStoreOrders(
      req.params.storeId,
      req.user.id,
      req.query
    );
    return paginated(res, orders, pagination, 'Store orders retrieved successfully');
  });
}

module.exports = new OrderController();
