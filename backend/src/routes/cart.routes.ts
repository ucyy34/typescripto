/**
 * Cart Routes
 * Shopping cart endpoints (supports both guest and authenticated users)
 */

import { Router } from 'express';

import cartController from '../controllers/cart.controller';
import { optionalAuth, authenticate } from '../middlewares/auth';
import { attachCartContext } from '../middlewares/cartContext';
import { validate, validateParams } from '../middlewares/validate';
import {
  addItemSchema,
  updateItemSchema,
  productIdParamSchema,
  checkoutSchema,
} from '../validators/cart.validator';

const router: Router = Router();

/**
 * @route   GET /api/v1/cart
 * @desc    Get cart (guest or user)
 * @access  Public (optionalAuth - works for both guest and authenticated)
 */
router.get('/', optionalAuth, attachCartContext, cartController.getCart);

router.get('/recommendations', optionalAuth, attachCartContext, cartController.getRecommendations);

/**
 * @route   POST /api/v1/cart/add
 * @desc    Add item to cart (Alias for /items for backward compatibility)
 * @access  Public (optionalAuth)
 */
router.post('/add', optionalAuth, attachCartContext, validate(addItemSchema), cartController.addItem);

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

export = router;
