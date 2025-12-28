/**
 * Product Routes
 * Product management endpoints
 */

import { Router } from 'express';

import productController from '../controllers/product.controller';
import { authenticate, requireSeller, requireAdmin, optionalAuth } from '../middlewares/auth';
import { uploadLimiter } from '../middlewares/rateLimiter';
import { productImageUpload } from '../middlewares/upload';
import { validate, validateQuery, validateParams } from '../middlewares/validate';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  productIdSchema,
  productQuerySchema,
  productSlugSchema,
} from '../validators/product.validator';

const router: Router = Router();

/**
 * @route   GET /api/v1/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', productController.getFeaturedProducts);

/**
 * @route   GET /api/v1/products/bestsellers
 * @desc    Get best-selling products
 * @access  Public
 */
router.get('/bestsellers', productController.getBestSellers);

/**
 * @route   GET /api/v1/products/random
 * @desc    Get random approved products
 * @access  Public
 */
router.get('/random', productController.getRandomProducts);

/**
 * @route   POST /api/v1/products/upload-image
 * @desc    Upload product image and convert to WebP
 * @access  Private (Seller only)
 */
router.post(
  '/upload-image',
  authenticate,
  requireSeller,
  uploadLimiter,
  productImageUpload,
  productController.uploadProductImage
);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Private (Seller only)
 */
router.post('/', authenticate, requireSeller, validate(createProductSchema), productController.createProduct);

/**
 * @route   GET /api/v1/products
 * @desc    Get all products with filters
 * @access  Public (optionalAuth for includeAllStatuses)
 */
router.get('/', optionalAuth, validateQuery(productQuerySchema), productController.getProducts);

router.get('/slug/:slug', validateParams(productSlugSchema), productController.getProductBySlug);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, validateParams(productIdSchema), productController.getProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Private (Product owner)
 */
router.put(
  '/:id',
  authenticate,
  requireSeller,
  validateParams(productIdSchema),
  validate(updateProductSchema),
  productController.updateProduct
);

/**
 * @route   PATCH /api/v1/products/:id/status
 * @desc    Update product status (approve/reject)
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  validateParams(productIdSchema),
  validate(updateProductStatusSchema),
  productController.updateProductStatus
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Product owner)
 */
router.delete('/:id', authenticate, requireSeller, validateParams(productIdSchema), productController.deleteProduct);

export = router;
