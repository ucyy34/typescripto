/**
 * Store Controller
 * Handle store HTTP requests
 */

import { Request, Response } from 'express';
import storeService from '../services/store.service';
import { success, created, noContent, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

class StoreController {
  /**
   * Create new store
   * POST /api/v1/stores
   */
  createStore = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const store = await storeService.createStore(authReq.user!.id, req.body);

    return created(res, store, 'Store created successfully. Waiting for admin approval.');
  });

  /**
   * Get store by ID
   * GET /api/v1/stores/:id
   */
  getStore = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const requester = authReq.user
      ? { id: authReq.user.id, role: authReq.user.role }
      : null;
    const store = await storeService.getStoreById(req.params.id, requester);

    return success(res, store, 'Store retrieved successfully');
  });

  /**
   * Get store by slug
   * GET /api/v1/stores/slug/:slug
   */
  getStoreBySlug = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const requester = authReq.user
      ? { id: authReq.user.id, role: authReq.user.role }
      : null;
    const store = await storeService.getStoreBySlug(req.params.slug, requester);

    return success(res, store, 'Store retrieved successfully');
  });

  /**
   * Get all stores with filters
   * GET /api/v1/stores
   */
  getStores = asyncHandler(async (req: Request, res: Response) => {
    const result = await storeService.getStores(req.query);

    return paginated(res, result.stores, result.pagination);
  });

  /**
   * Get my store (seller)
   * GET /api/v1/stores/my-store
   */
  getMyStore = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const store = await storeService.getStoreByUserId(authReq.user!.id);

    if (!store) {
      return success(res, null, 'No store found for this user');
    }

    return success(res, store, 'Store retrieved successfully');
  });

  /**
   * Update store
   * PUT /api/v1/stores/:id
   */
  updateStore = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const store = await storeService.updateStore(req.params.id, authReq.user!.id, req.body);

    return success(res, store, 'Store updated successfully');
  });

  /**
   * Update store status (admin only)
   * PATCH /api/v1/stores/:id/status
   */
  updateStoreStatus = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { status, rejection_reason } = req.body;
    const store = await storeService.updateStoreStatus(req.params.id, authReq.user!.id, status, rejection_reason);

    return success(res, store, `Store status updated to ${status}`);
  });

  /**
   * Delete store
   * DELETE /api/v1/stores/:id
   */
  deleteStore = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await storeService.deleteStore(req.params.id, authReq.user!.id);

    return noContent(res);
  });

  /**
   * Get store statistics
   * GET /api/v1/stores/:id/stats
   */
  getStoreStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await storeService.getStoreStats(req.params.id);

    return success(res, stats, 'Store statistics retrieved successfully');
  });
}

export = new StoreController();
