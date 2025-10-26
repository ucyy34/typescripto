/**
 * Wishlist Routes
 */

const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const { optionalAuth, authenticate } = require('../middlewares/auth');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
  addItemSchema,
  productIdParamSchema,
  recommendationQuerySchema,
} = require('../validators/wishlist.validator');

router.get('/', optionalAuth, wishlistController.getWishlist);

router.post('/items', optionalAuth, validate(addItemSchema), wishlistController.addItem);

router.delete(
  '/items/:productId',
  optionalAuth,
  validateParams(productIdParamSchema),
  wishlistController.removeItem
);

router.delete('/', optionalAuth, wishlistController.clearWishlist);

router.post('/merge', authenticate, wishlistController.mergeWishlist);

router.get(
  '/recommendations',
  optionalAuth,
  validateQuery(recommendationQuerySchema),
  wishlistController.getRecommendations
);

module.exports = router;
