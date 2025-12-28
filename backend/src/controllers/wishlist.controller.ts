/**
 * Wishlist Controller
 * Handles API endpoints for user wishlists
 */

import { Request, Response } from 'express';

import wishlistService = require('../services/wishlist.service');

import { success } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface WishlistParams {
  productId: string;
}

interface AddWishlistBody {
  product_id: string;
  metadata?: Record<string, unknown> | null;
}

interface SyncWishlistBody {
  items?: Array<{ product_id?: string } | string>;
}

class WishlistController {
  getWishlist = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req;
    const items = await wishlistService.list(authReq.user!.id);
    return success(res, { items, totals: { count: items.length } }, 'Wishlist retrieved successfully');
  });

  addItem = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, AddWishlistBody>, res: Response) => {
    const authReq = req;
    const { product_id: productId, metadata = null } = req.body;
    const items = await wishlistService.add(authReq.user!.id, productId, metadata);
    return success(res, { items, totals: { count: items.length } }, 'Product added to wishlist successfully', 201);
  });

  removeItem = asyncHandler(async (req: AuthenticatedRequest<WishlistParams>, res: Response) => {
    const authReq = req;
    const { productId } = req.params;
    const items = await wishlistService.remove(authReq.user!.id, productId);
    return success(res, { items, totals: { count: items.length } }, 'Product removed from wishlist successfully');
  });

  syncWishlist = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, SyncWishlistBody>, res: Response) => {
    const authReq = req;
    const { items = [] } = req.body;
    const productIds = items.map((item) => (typeof item === 'string' ? item : item.product_id)).filter(Boolean) as string[];
    const wishlistItems = await wishlistService.sync(authReq.user!.id, productIds);
    return success(res, { items: wishlistItems, totals: { count: wishlistItems.length } }, 'Wishlist synchronized successfully');
  });
}

export = new WishlistController();
