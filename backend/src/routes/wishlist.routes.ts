/**
 * Wishlist Routes
 */

import { Router } from 'express';

import wishlistController from '../controllers/wishlist.controller';
import { authenticate } from '../middlewares/auth';
import { validate, validateParams } from '../middlewares/validate';
import {
  addWishlistItemSchema,
  productIdParamSchema,
  syncWishlistSchema,
} from '../validators/wishlist.validator';

const router: Router = Router();

router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/', validate(addWishlistItemSchema), wishlistController.addItem);
router.post('/sync', validate(syncWishlistSchema), wishlistController.syncWishlist);
router.delete('/:productId', validateParams(productIdParamSchema), wishlistController.removeItem);

export = router;
