/**
 * Store Routes
 * Store management endpoints
 */

const express = require('express');
const router = express.Router();

const storeController = require('../controllers/store.controller');
const productController = require('../controllers/product.controller');
const orderController = require('../controllers/order.controller');
const { authenticate, requireSeller, requireAdmin } = require('../middlewares/auth');
const { validate, validateQuery, validateParams } = require('../middlewares/validate');
const {
  createStoreSchema,
  updateStoreSchema,
  updateStoreStatusSchema,
  storeIdSchema,
  storeQuerySchema,
} = require('../validators/store.validator');
const { productQuerySchema } = require('../validators/product.validator');
const { orderQuerySchema, storeIdParamSchema } = require('../validators/order.validator');

// Nested routes
const storeCampaignRoutes = require('./store-campaign.routes');

/**
 * @route   POST /api/v1/stores
 * @desc    Create new store
 * @access  Private (Seller only)
 */
router.post('/', authenticate, requireSeller, validate(createStoreSchema), storeController.createStore);

/**
 * @route   GET /api/v1/stores/my-store
 * @desc    Get my store (logged-in seller)
 * @access  Private (Seller)
 */
router.get('/my-store', authenticate, requireSeller, storeController.getMyStore);

/**
 * @route   GET /api/v1/stores
 * @desc    Get all stores with filters and pagination
 * @access  Public
 */
router.get('/', validateQuery(storeQuerySchema), storeController.getStores);

/**
 * @route   GET /api/v1/stores/:id
 * @desc    Get store by ID
 * @access  Public
 */
router.get('/:id', validateParams(storeIdSchema), storeController.getStore);

/**
 * @route   GET /api/v1/stores/:id/stats
 * @desc    Get store statistics
 * @access  Public
 */
router.get('/:id/stats', validateParams(storeIdSchema), storeController.getStoreStats);

/**
 * @route   GET /api/v1/stores/:storeId/products
 * @desc    Get all products from a store
 * @access  Public
 */
router.get('/:storeId/products', validateQuery(productQuerySchema), productController.getProductsByStore);

/**
 * @route   GET /api/v1/stores/:storeId/orders
 * @desc    Get all orders for a store
 * @access  Private (Store owner/seller)
 */
router.get(
  '/:storeId/orders',
  authenticate,
  requireSeller,
  validateParams(storeIdParamSchema),
  validateQuery(orderQuerySchema),
  orderController.getStoreOrders
);

/**
 * @route   PUT /api/v1/stores/:id
 * @desc    Update store
 * @access  Private (Store owner)
 */
router.put(
  '/:id',
  authenticate,
  requireSeller,
  validateParams(storeIdSchema),
  validate(updateStoreSchema),
  storeController.updateStore
);

/**
 * @route   PATCH /api/v1/stores/:id/status
 * @desc    Update store status (approve/reject/suspend)
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  validateParams(storeIdSchema),
  validate(updateStoreStatusSchema),
  storeController.updateStoreStatus
);

/**
 * @route   DELETE /api/v1/stores/:id
 * @desc    Delete store (soft delete)
 * @access  Private (Store owner)
 */
router.delete('/:id', authenticate, requireSeller, validateParams(storeIdSchema), storeController.deleteStore);

/**
 * Nested Routes
 * /api/v1/stores/:storeId/campaigns/*
 */
router.use('/:storeId/campaigns', storeCampaignRoutes);

module.exports = router;
