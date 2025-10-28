/**
 * Order Routes
 * Order management endpoints with FSM state machine
 */

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const { authenticate, optionalAuth, requireSeller, requireSellerOrAdmin, requireAdmin } = require('../middlewares/auth');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
  orderQuerySchema,
  markPaidSchema,
  markShippedSchema,
  markCompletedSchema,
} = require('../validators/order.validator');

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Public (guest checkout supported) / Private (authenticated users)
 * @note    Authentication optional - guests can place orders
 */
router.post('/', optionalAuth, validate(createOrderSchema), orderController.createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    Get user's orders
 * @access  Private (authenticated users)
 */
router.get('/', authenticate, validateQuery(orderQuerySchema), orderController.getUserOrders);

/**
 * @route   GET /api/v1/orders/admin
 * @desc    Get all orders (admin only)
 * @access  Private (admin)
 */
router.get('/admin', authenticate, requireAdmin, validateQuery(orderQuerySchema), orderController.getAllOrders);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private (authenticated users - own orders only)
 */
router.get('/:id', authenticate, validateParams(orderIdParamSchema), orderController.getOrder);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status (seller or admin)
 * @access  Private (seller/admin)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireSellerOrAdmin,
  validateParams(orderIdParamSchema),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

router.post(
  '/:id/mark-paid',
  authenticate,
  requireAdmin,
  validateParams(orderIdParamSchema),
  validate(markPaidSchema),
  orderController.markPaid
);

router.post(
  '/:id/mark-shipped',
  authenticate,
  requireSellerOrAdmin,
  validateParams(orderIdParamSchema),
  validate(markShippedSchema),
  orderController.markShipped
);

router.post(
  '/:id/mark-completed',
  authenticate,
  requireSellerOrAdmin,
  validateParams(orderIdParamSchema),
  validate(markCompletedSchema),
  orderController.markCompleted
);

module.exports = router;
