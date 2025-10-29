/**
 * Cart Controller
 * Handles cart operations for both authenticated and guest users
 */

const cartService = require('../services/cart.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const recommendationService = require('../services/recommendation.service');
const orderService = require('../services/order.service');

class CartController {
  /**
   * Get cart (user or guest)
   * @route GET /api/v1/cart
   */
  getCart = asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const guestId = req.guestId || null;

    const cart = await cartService.getCart(userId, guestId);

    return success(res, cart, 'Cart retrieved successfully');
  });

  /**
   * Checkout current cart and create an order
   * @route POST /api/v1/cart/checkout
   */
  checkout = asyncHandler(async (req, res) => {
    const checkoutInput = req.body || {};
    const userId = req.user ? req.user.id : null;
    const guestId = req.guestId || null;

    const cart = await cartService.getCart(userId, guestId);

    const ordersResult = await orderService.createFromCart(userId, cart, checkoutInput);

    if (userId) {
      await cartService.clearCart(userId, null);
    } else if (guestId) {
      await cartService.clearCart(null, guestId);
    }

    return success(res, ordersResult, 'Checkout completed successfully', 201);
  });

  /**
   * Add item to cart
   * @route POST /api/v1/cart/items
   */
  addItem = asyncHandler(async (req, res) => {
    const { product_id, quantity } = req.body;
    const userId = req.user?.id || null;
    const guestId = req.guestId || null;

    const cart = await cartService.addItem(userId, guestId, product_id, quantity);

    return success(res, cart, 'Item added to cart successfully', 201);
  });

  /**
   * Update cart item quantity
   * @route PUT /api/v1/cart/items/:productId
   */
  updateItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id || null;
    const guestId = req.guestId || null;

    const cart = await cartService.updateItem(userId, guestId, productId, quantity);

    return success(res, cart, 'Cart item updated successfully');
  });

  /**
   * Remove item from cart
   * @route DELETE /api/v1/cart/items/:productId
   */
  removeItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.id || null;
    const guestId = req.guestId || null;

    const cart = await cartService.removeItem(userId, guestId, productId);

    return success(res, cart, 'Item removed from cart successfully');
  });

  /**
   * Clear cart
   * @route DELETE /api/v1/cart
   */
  clearCart = asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const guestId = req.guestId || null;

    const cart = await cartService.clearCart(userId, guestId);

    return success(res, cart, 'Cart cleared successfully');
  });

  /**
   * Merge guest cart to user cart (called after login)
   * @route POST /api/v1/cart/merge
   */
  mergeCart = asyncHandler(async (req, res) => {
    if (!req.user) {
      return success(res, { items: [], totals: { subtotal: 0, item_count: 0 } }, 'No user logged in');
    }

    const guestId = req.guestId || null;

    const cart = await cartService.mergeGuestCartToUser(req.user.id, guestId);
    return success(res, cart, 'Cart merged successfully');
  });

  /**
   * Get product recommendations for the current cart context
   * @route GET /api/v1/cart/recommendations
   */
  getRecommendations = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

    const userId = req.user?.id || null;
    const guestId = req.guestId || null;

    const cart = await cartService.getCart(userId, guestId);

    const recommendations = await recommendationService.getCartRecommendations({
      cartItems: cart.items || [],
      userId: req.user?.id || null,
      limit,
    });

    return success(
      res,
      { items: recommendations, totals: { count: recommendations.length } },
      'Recommendations retrieved successfully'
    );
  });
}

module.exports = new CartController();
