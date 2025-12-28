/**
 * Wishlist Controller
 * Handles API endpoints for user wishlists
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types
import _wishlistService from '../services/wishlist.service';
const wishlistService = _wishlistService as any;

import { success } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

class WishlistController {
  getWishlist = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const items = await wishlistService.list(authReq.user!.id);
    return success(res, { items, totals: { count: items.length } }, 'Wishlist retrieved successfully');
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { product_id: productId, metadata = null } = req.body;
    const items = await wishlistService.add(authReq.user!.id, productId, metadata);
    return success(res, { items, totals: { count: items.length } }, 'Product added to wishlist successfully', 201);
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { productId } = req.params;
    const items = await wishlistService.remove(authReq.user!.id, productId);
    return success(res, { items, totals: { count: items.length } }, 'Product removed from wishlist successfully');
  });

  syncWishlist = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { items = [] } = req.body;
    const productIds = items.map((item: any) => item.product_id || item);
    const wishlistItems = await wishlistService.sync(authReq.user!.id, productIds);
    return success(res, { items: wishlistItems, totals: { count: wishlistItems.length } }, 'Wishlist synchronized successfully');
  });
}

export = new WishlistController();
