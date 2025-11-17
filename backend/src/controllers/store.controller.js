/**
 * Store Controller
 * Handle store HTTP requests
 */

const storeService = require('../services/store.service');
const { success, created, noContent, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class StoreController {
  /**
   * Create new store
   * POST /api/v1/stores
   */
  createStore = asyncHandler(async (req, res) => {
    const store = await storeService.createStore(req.user.id, req.body);

    return created(res, store, 'Store created successfully. Waiting for admin approval.');
  });

  /**
   * Get store by ID
   * GET /api/v1/stores/:id
   */
  getStore = asyncHandler(async (req, res) => {
    const requester = req.user
      ? { id: req.user.id, role: req.user.role }
      : null;
    const store = await storeService.getStoreById(req.params.id, requester);

    return success(res, store, 'Store retrieved successfully');
  });

  /**
   * Get store by slug
   * GET /api/v1/stores/slug/:slug
   */
  getStoreBySlug = asyncHandler(async (req, res) => {
    const requester = req.user
      ? { id: req.user.id, role: req.user.role }
      : null;
    const store = await storeService.getStoreBySlug(req.params.slug, requester);

    return success(res, store, 'Store retrieved successfully');
  });

  /**
   * Get all stores with filters
   * GET /api/v1/stores
   */
  getStores = asyncHandler(async (req, res) => {
    const result = await storeService.getStores(req.query);

    return paginated(res, result.stores, result.pagination);
  });

  /**
   * Get my store (seller)
   * GET /api/v1/stores/my-store
   */
  getMyStore = asyncHandler(async (req, res) => {
    const store = await storeService.getStoreByUserId(req.user.id);

    if (!store) {
      return success(res, null, 'No store found for this user');
    }

    return success(res, store, 'Store retrieved successfully');
  });

  /**
   * Update store
   * PUT /api/v1/stores/:id
   */
  updateStore = asyncHandler(async (req, res) => {
    const store = await storeService.updateStore(req.params.id, req.user.id, req.body);

    return success(res, store, 'Store updated successfully');
  });

  /**
   * Update store status (admin only)
   * PATCH /api/v1/stores/:id/status
   */
  updateStoreStatus = asyncHandler(async (req, res) => {
    const { status, rejection_reason } = req.body;
    const store = await storeService.updateStoreStatus(req.params.id, req.user.id, status, rejection_reason);

    return success(res, store, `Store status updated to ${status}`);
  });

  /**
   * Delete store
   * DELETE /api/v1/stores/:id
   */
  deleteStore = asyncHandler(async (req, res) => {
    await storeService.deleteStore(req.params.id, req.user.id);

    return noContent(res);
  });

  /**
   * Get store statistics
   * GET /api/v1/stores/:id/stats
   */
  getStoreStats = asyncHandler(async (req, res) => {
    const stats = await storeService.getStoreStats(req.params.id);

    return success(res, stats, 'Store statistics retrieved successfully');
  });
}

module.exports = new StoreController();
