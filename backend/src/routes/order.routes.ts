/**
 * Order Routes
 * Order management endpoints with FSM state machine
 */

import { Router } from 'express';

import orderController from '../controllers/order.controller';
import { authenticate, optionalAuth, requireSeller, requireSellerOrAdmin, requireAdmin } from '../middlewares/auth';
import { validate, validateParams, validateQuery } from '../middlewares/validate';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
  orderQuerySchema,
  markPaidSchema,
  markShippedSchema,
  markCompletedSchema,
} from '../validators/order.validator';

const router: Router = Router();

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Public (guest checkout supported) / Private (authenticated users)
 */
router.post('/', optionalAuth, validate(createOrderSchema), orderController.createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    Get user's orders
 * @access  Private (authenticated users)
 */
router.get('/', authenticate, validateQuery(orderQuerySchema), orderController.getUserOrders);

/**
 * @route   GET /api/v1/orders/track/:orderNumber
 * @desc    Track order by order number (public)
 * @access  Public
 */
router.get('/track/:orderNumber', orderController.trackOrder);

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
  requireSellerOrAdmin,
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

export = router;
