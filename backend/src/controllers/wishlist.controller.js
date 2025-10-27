/**
 * Wishlist Controller
 */

const wishlistService = require('../services/wishlist.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class WishlistController {
  getWishlist = asyncHandler(async (req, res) => {
    const data = await wishlistService.getWishlist(req.user, req.session);
    return success(res, data, 'Wishlist retrieved successfully');
  });

  addItem = asyncHandler(async (req, res) => {
    const { product_id } = req.body;
    const data = await wishlistService.addItem(req.user, req.session, product_id);
    return success(res, data, 'Item added to wishlist', 201);
  });

  removeItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const data = await wishlistService.removeItem(req.user, req.session, productId);
    return success(res, data, 'Item removed from wishlist');
  });

  clearWishlist = asyncHandler(async (req, res) => {
    const data = await wishlistService.clearWishlist(req.user, req.session);
    return success(res, data, 'Wishlist cleared successfully');
  });

  mergeWishlist = asyncHandler(async (req, res) => {
    const data = await wishlistService.mergeGuestWishlist(req.user.id, req.session);
    return success(res, data, 'Wishlist merged successfully');
  });

  getRecommendations = asyncHandler(async (req, res) => {
    const { limit = 6, seed, include_cart, include_wishlist } = req.query;
    const includeCart = include_cart !== undefined ? include_cart : true;
    const includeWishlist = include_wishlist !== undefined ? include_wishlist : true;
    const parsedSeed = this._parseSeed(seed);

    const recommendations = await wishlistService.getRecommendations({
      user: req.user,
      session: req.session,
      seedProductIds: parsedSeed,
      limit,
      includeCart,
      includeWishlist,
    });

    return success(res, { items: recommendations, count: recommendations.length }, 'Recommendations generated successfully');
  });

  _parseSeed(seed) {
    if (!seed) {
      return [];
    }

    if (Array.isArray(seed)) {
      return seed.filter(Boolean);
    }

    if (typeof seed === 'string') {
      return seed
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    return [];
  }
}

module.exports = new WishlistController();
