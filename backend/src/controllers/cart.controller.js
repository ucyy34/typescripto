/**
 * Cart Controller
 * Handles cart operations for both authenticated and guest users
 */

const cartService = require('../services/cart.service');
const orderService = require('../services/order.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const recommendationService = require('../services/recommendation.service');
const { publishCartEvent, CART_EVENTS } = require('../events/cart.events');

class CartController {
  /**
   * Get cart (user or guest)
   * @route GET /api/v1/cart
   */
  getCart = asyncHandler(async (req, res) => {
    let cart;

    if (req.user) {
      // Authenticated user - get from database
      cart = await cartService.getUserCart(req.user.id);
    } else {
      // Guest user - get from session
      cart = await cartService.getGuestCart(req.session);
    }

    return success(res, cart, 'Cart retrieved successfully');
  });

  /**
   * Add item to cart
   * @route POST /api/v1/cart/items
   */
  addItem = asyncHandler(async (req, res) => {
    const { product_id, quantity } = req.body;
    let cart;

    if (req.user) {
      cart = await cartService.addItemToUserCart(req.user.id, product_id, quantity);
    } else {
      cart = await cartService.addItemToGuestCart(req.session, product_id, quantity);
    }

    return success(res, cart, 'Item added to cart successfully', 201);
  });

  /**
   * Update cart item quantity
   * @route PUT /api/v1/cart/items/:productId
   */
  updateItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    let cart;

    if (req.user) {
      cart = await cartService.updateUserCartItem(req.user.id, productId, quantity);
    } else {
      cart = await cartService.updateGuestCartItem(req.session, productId, quantity);
    }

    return success(res, cart, 'Cart item updated successfully');
  });

  /**
   * Remove item from cart
   * @route DELETE /api/v1/cart/items/:productId
   */
  removeItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    let cart;

    if (req.user) {
      cart = await cartService.removeItemFromUserCart(req.user.id, productId);
    } else {
      cart = await cartService.removeItemFromGuestCart(req.session, productId);
    }

    return success(res, cart, 'Item removed from cart successfully');
  });

  /**
   * Clear cart
   * @route DELETE /api/v1/cart
   */
  clearCart = asyncHandler(async (req, res) => {
    let cart;

    if (req.user) {
      cart = await cartService.clearUserCart(req.user.id);
    } else {
      cart = cartService.clearGuestCart(req.session);
    }

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

    const cart = await cartService.mergeGuestCartToUser(req.user.id, req.session);
    return success(res, cart, 'Cart merged successfully');
  });

  /**
   * Checkout cart and create order
   * @route POST /api/v1/cart/checkout
   */
  checkout = asyncHandler(async (req, res) => {
    const checkoutPayload = req.body || {};
    const isAuthenticated = Boolean(req.user);
    const userId = req.user ? req.user.id : null;

    const cart = isAuthenticated
      ? await cartService.getUserCart(userId)
      : await cartService.getGuestCart(req.session);

    const order = await orderService.createFromCart({
      userId,
      cartItems: cart.items,
      checkout: {
        ...checkoutPayload,
        metadata: {
          ...(checkoutPayload.metadata || {}),
          cartId: cart.id || null,
          guest: !isAuthenticated,
        },
      },
    });

    if (isAuthenticated) {
      await cartService.clearUserCart(userId);
    } else {
      cartService.clearGuestCart(req.session);
    }

    await publishCartEvent(CART_EVENTS.CHECKED_OUT, {
      cartId: cart.id || null,
      orderId: order.id,
      userId,
      guest: !isAuthenticated,
    });

    return success(res, order, 'Checkout completed successfully', 201);
  });

  /**
   * Get product recommendations for the current cart context
   * @route GET /api/v1/cart/recommendations
   */
  getRecommendations = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

    let cart;
    if (req.user) {
      cart = await cartService.getUserCart(req.user.id);
    } else {
      cart = await cartService.getGuestCart(req.session);
    }

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
