/**
 * Cart Routes
 * Shopping cart endpoints (supports both guest and authenticated users)
 */

const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const { optionalAuth, authenticate } = require('../middlewares/auth');
const { validate, validateParams } = require('../middlewares/validate');
const {
  addItemSchema,
  updateItemSchema,
  productIdParamSchema,
  checkoutSchema,
} = require('../validators/cart.validator');

/**
 * @route   GET /api/v1/cart
 * @desc    Get cart (guest or user)
 * @access  Public (optionalAuth - works for both guest and authenticated)
 */
router.get('/', optionalAuth, cartController.getCart);

router.get('/recommendations', optionalAuth, cartController.getRecommendations);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Add item to cart
 * @access  Public (optionalAuth)
 */
router.post('/items', optionalAuth, validate(addItemSchema), cartController.addItem);

/**
 * @route   PUT /api/v1/cart/items/:productId
 * @desc    Update cart item quantity
 * @access  Public (optionalAuth)
 */
router.put(
  '/items/:productId',
  optionalAuth,
  validateParams(productIdParamSchema),
  validate(updateItemSchema),
  cartController.updateItem
);

/**
 * @route   DELETE /api/v1/cart/items/:productId
 * @desc    Remove item from cart
 * @access  Public (optionalAuth)
 */
router.delete(
  '/items/:productId',
  optionalAuth,
  validateParams(productIdParamSchema),
  cartController.removeItem
);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear cart
 * @access  Public (optionalAuth)
 */
router.delete('/', optionalAuth, cartController.clearCart);

/**
 * @route   POST /api/v1/cart/merge
 * @desc    Merge guest cart to user cart (after login)
 * @access  Private (authenticated users only)
 */
router.post('/merge', authenticate, cartController.mergeCart);

router.post('/checkout', optionalAuth, validate(checkoutSchema), cartController.checkout);

module.exports = router;
