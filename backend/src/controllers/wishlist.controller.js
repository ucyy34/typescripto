/**
 * Wishlist Controller
 * Handles API endpoints for user wishlists
 */

const wishlistService = require('../services/wishlist.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class WishlistController {
  /**
   * Get authenticated user's wishlist
   * @route GET /api/v1/wishlist
   */
  getWishlist = asyncHandler(async (req, res) => {
    const items = await wishlistService.list(req.user.id);
    return success(res, { items, totals: { count: items.length } }, 'Wishlist retrieved successfully');
  });

  /**
   * Add product to wishlist
   * @route POST /api/v1/wishlist
   */
  addItem = asyncHandler(async (req, res) => {
    const { product_id: productId, metadata = null } = req.body;
    const items = await wishlistService.add(req.user.id, productId, metadata);
    return success(
      res,
      { items, totals: { count: items.length } },
      'Product added to wishlist successfully',
      201
    );
  });

  /**
   * Remove product from wishlist
   * @route DELETE /api/v1/wishlist/:productId
   */
  removeItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const items = await wishlistService.remove(req.user.id, productId);
    return success(res, { items, totals: { count: items.length } }, 'Product removed from wishlist successfully');
  });

  /**
   * Sync wishlist with provided product IDs (used when migrating from guest)
   * @route POST /api/v1/wishlist/sync
   */
  syncWishlist = asyncHandler(async (req, res) => {
    const { items = [] } = req.body;
    const productIds = items.map((item) => item.product_id || item);
    const wishlistItems = await wishlistService.sync(req.user.id, productIds);
    return success(
      res,
      { items: wishlistItems, totals: { count: wishlistItems.length } },
      'Wishlist synchronized successfully'
    );
  });
}

module.exports = new WishlistController();
