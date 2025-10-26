/**
 * Wishlist Routes
 */

const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const { authenticate } = require('../middlewares/auth');
const { validate, validateParams } = require('../middlewares/validate');
const {
  addWishlistItemSchema,
  productIdParamSchema,
  syncWishlistSchema,
} = require('../validators/wishlist.validator');

router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/', validate(addWishlistItemSchema), wishlistController.addItem);
router.post('/sync', validate(syncWishlistSchema), wishlistController.syncWishlist);
router.delete(
  '/:productId',
  validateParams(productIdParamSchema),
  wishlistController.removeItem
);

module.exports = router;
