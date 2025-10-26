/**
 * Product Routes
 * Product management endpoints
 */

const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { authenticate, requireSeller, requireAdmin, optionalAuth } = require('../middlewares/auth');
const { validate, validateQuery, validateParams } = require('../middlewares/validate');
const {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  productIdSchema,
  productQuerySchema,
} = require('../validators/product.validator');

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
 * @route   GET /api/v1/products/slug/:slug
 * @desc    Get product by slug
 * @access  Public
 */
router.get('/slug/:slug', optionalAuth, productController.getProductBySlug);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Private (Seller only)
 */
router.post('/', authenticate, requireSeller, validate(createProductSchema), productController.createProduct);

/**
 * @route   GET /api/v1/products
 * @desc    Get all products with filters
 * @access  Public
 */
router.get('/', validateQuery(productQuerySchema), productController.getProducts);

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

module.exports = router;
