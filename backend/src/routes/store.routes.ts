/**
 * Store Routes
 * Store management endpoints
 */

import { Router } from 'express';

import storeController from '../controllers/store.controller';
import productController from '../controllers/product.controller';
import orderController from '../controllers/order.controller';
import { authenticate, requireSeller, requireAdmin } from '../middlewares/auth';
import { validate, validateQuery, validateParams } from '../middlewares/validate';
import {
  createStoreSchema,
  updateStoreSchema,
  updateStoreStatusSchema,
  storeIdSchema,
  storeSlugSchema,
  storeQuerySchema,
} from '../validators/store.validator';
import { productQuerySchema } from '../validators/product.validator';
import { orderQuerySchema, storeIdParamSchema } from '../validators/order.validator';

// Nested routes
import storeCampaignRoutes from './store-campaign.routes';

const router: Router = Router();

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
 * @route   GET /api/v1/stores/slug/:slug
 * @desc    Get store by slug
 * @access  Public
 */
router.get('/slug/:slug', validateParams(storeSlugSchema), storeController.getStoreBySlug);

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

export = router;
