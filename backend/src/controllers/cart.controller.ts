/**
 * Cart Controller
 * Handles cart operations for both authenticated and guest users
 */

import { Request, Response } from 'express';

import cartService = require('../services/cart.service');
import recommendationService = require('../services/recommendation.service');
import orderService = require('../services/order.service');

import { success } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface CartItemParams {
  productId: string;
}

interface AddItemBody {
  product_id: string;
  quantity: number;
  variant_sku?: string;
  variant_price?: number;
  variant_stock?: number;
  variant_selection?: Record<string, string | number | boolean | null>;
}

interface UpdateItemBody {
  quantity: number;
}

interface CheckoutBody {
  store_id?: string;
  shipping_address?: Record<string, string | number | boolean | null | undefined>;
  billing_address?: Record<string, string | number | boolean | null | undefined>;
  payment_method?: string;
  customer_note?: string;
}

interface RecommendationQuery {
  limit?: string;
}

class CartController {
  getCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req;
    const userId = authReq.user?.id || null;
    const cart = await cartService.getCart(userId, authReq.guestId);
    return success(res, cart, 'Cart retrieved successfully');
  });

  checkout = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, CheckoutBody>, res: Response) => {
    const authReq = req;
    const checkoutInput = req.body || {};
    const userId = authReq.user ? authReq.user.id : null;
    const cart = await cartService.getCart(userId, authReq.guestId);
    const orders = await orderService.createFromCart(userId, cart, checkoutInput);

    if (authReq.user) {
      await cartService.clearCart(userId, null);
    } else if (authReq.guestId) {
      await cartService.clearCart(null, authReq.guestId);
    }

    return success(res, { orders }, 'Checkout completed successfully', 201);
  });

  addItem = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, AddItemBody>, res: Response) => {
    const authReq = req;
    const { product_id, quantity, variant_sku, variant_price, variant_stock, variant_selection } = req.body;
    const userId = authReq.user?.id || null;
    const cart = await cartService.addItem(
      userId,
      authReq.guestId,
      product_id,
      quantity,
      {
        sku: variant_sku,
        price: variant_price,
        stock: variant_stock,
        selection: variant_selection,
      }
    );
    return success(res, cart, 'Item added to cart successfully', 201);
  });

  updateItem = asyncHandler(async (req: AuthenticatedRequest<CartItemParams, unknown, UpdateItemBody>, res: Response) => {
    const authReq = req;
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = authReq.user?.id || null;
    const cart = await cartService.updateItem(userId, authReq.guestId, productId, quantity);
    return success(res, cart, 'Cart item updated successfully');
  });

  removeItem = asyncHandler(async (req: AuthenticatedRequest<CartItemParams>, res: Response) => {
    const authReq = req;
    const { productId } = req.params;
    const userId = authReq.user?.id || null;
    const cart = await cartService.removeItem(userId, authReq.guestId, productId);
    return success(res, cart, 'Item removed from cart successfully');
  });

  clearCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req;
    const userId = authReq.user?.id || null;
    const cart = await cartService.clearCart(userId, authReq.guestId);
    return success(res, cart, 'Cart cleared successfully');
  });

  mergeCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req;
    if (!authReq.user) {
      return success(res, { items: [], totals: { subtotal: 0, item_count: 0 } }, 'No user logged in');
    }
    const cart = await cartService.mergeGuestCartToUser(authReq.user.id, authReq.guestId);
    return success(res, cart, 'Cart merged successfully');
  });

  getRecommendations = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, unknown, RecommendationQuery>, res: Response) => {
    const authReq = req;
    const limit = Math.min(parseInt(req.query.limit || '6', 10) || 6, 20);
    const cart = await cartService.getCart(authReq.user?.id || null, authReq.guestId);
    const recommendations = await recommendationService.getCartRecommendations({
      cartItems: cart.items || [],
      userId: authReq.user?.id || null,
      limit,
    });
    return success(
      res,
      { items: recommendations, totals: { count: recommendations.length } },
      'Recommendations retrieved successfully'
    );
  });
}

export = new CartController();
