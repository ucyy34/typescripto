/**
 * Category Routes
 * Category management endpoints
 */

const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/category.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');

/**
 * @route   GET /api/v1/categories/top-level
 * @desc    Get top-level categories
 * @access  Public
 */
router.get('/top-level', categoryController.getTopLevelCategories);

/**
 * @route   GET /api/v1/categories/featured
 * @desc    Get featured categories
 * @access  Public
 */
router.get('/featured', categoryController.getFeaturedCategories);

/**
 * @route   GET /api/v1/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get('/slug/:slug', categoryController.getCategoryBySlug);

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories (tree structure)
 * @access  Public
 */
router.get('/', categoryController.getAllCategories);

/**
 * @route   GET /api/v1/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get('/slug/:slug', categoryController.getCategoryBySlug);

/**
 * @route   GET /api/v1/categories/:id/variants
 * @desc    Get variants for a category
 * @access  Public
 */
router.get('/:id/variants', categoryController.getCategoryVariants);

/**
 * @route   POST /api/v1/categories/:id/variants
 * @desc    Create variant for a category
 * @access  Private (Admin only)
 */
router.post('/:id/variants', authenticate, requireAdmin, categoryController.createVariant);

/**
 * @route   PUT /api/v1/categories/:id/variants/:variantId
 * @desc    Update variant
 * @access  Private (Admin only)
 */
router.put('/:id/variants/:variantId', authenticate, requireAdmin, categoryController.updateVariant);

/**
 * @route   DELETE /api/v1/categories/:id/variants/:variantId
 * @desc    Delete variant
 * @access  Private (Admin only)
 */
router.delete('/:id/variants/:variantId', authenticate, requireAdmin, categoryController.deleteVariant);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', categoryController.getCategoryById);

/**
 * @route   POST /api/v1/categories
 * @desc    Create category
 * @access  Private (Admin only)
 */
router.post('/', authenticate, requireAdmin, categoryController.createCategory);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update category
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, categoryController.updateCategory);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, categoryController.deleteCategory);

module.exports = router;

