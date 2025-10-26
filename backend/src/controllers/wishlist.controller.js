/**
 * Wishlist Controller
 */

const wishlistService = require('../services/wishlist.service');
const { success, created, noContent } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class WishlistController {
  list = asyncHandler(async (req, res) => {
    const items = await wishlistService.getWishlist(req.user.id);
    return success(res, { items }, 'Wishlist retrieved successfully');
  });

  add = asyncHandler(async (req, res) => {
    const item = await wishlistService.addItem(req.user.id, req.body.product_id);
    return created(res, item, 'Product added to wishlist');
  });

  remove = asyncHandler(async (req, res) => {
    await wishlistService.removeItem(req.user.id, req.params.productId);
    return noContent(res);
  });
}

module.exports = new WishlistController();
