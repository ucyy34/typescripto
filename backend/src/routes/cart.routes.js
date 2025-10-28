/**
 * Cart Routes
 * Shopping cart endpoints (supports both guest and authenticated users)
 */

const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const { optionalAuth, authenticate } = require('../middlewares/auth');
const { attachCartContext } = require('../middlewares/cartContext');
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
router.get('/', optionalAuth, attachCartContext, cartController.getCart);

router.get('/recommendations', optionalAuth, attachCartContext, cartController.getRecommendations);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Add item to cart
 * @access  Public (optionalAuth)
 */
router.post('/items', optionalAuth, attachCartContext, validate(addItemSchema), cartController.addItem);

/**
 * @route   PUT /api/v1/cart/items/:productId
 * @desc    Update cart item quantity
 * @access  Public (optionalAuth)
 */
router.put(
  '/items/:productId',
  optionalAuth,
  attachCartContext,
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
  attachCartContext,
  validateParams(productIdParamSchema),
  cartController.removeItem
);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear cart
 * @access  Public (optionalAuth)
 */
router.delete('/', optionalAuth, attachCartContext, cartController.clearCart);

/**
 * @route   POST /api/v1/cart/merge
 * @desc    Merge guest cart to user cart (after login)
 * @access  Private (authenticated users only)
 */
router.post('/merge', authenticate, attachCartContext, cartController.mergeCart);

/**
 * @route   POST /api/v1/cart/checkout
 * @desc    Checkout current cart and create order
 * @access  Public (optionalAuth)
 */
router.post('/checkout', optionalAuth, attachCartContext, validate(checkoutSchema), cartController.checkout);

module.exports = router;
