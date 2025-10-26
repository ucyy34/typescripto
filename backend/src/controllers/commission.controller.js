/**
 * Commission Controller
 * Handles commission-related operations
 */

const commissionService = require('../services/commission.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class CommissionController {
  /**
   * Get commission for an order
   * @route GET /api/v1/commissions/order/:id
   */
  getCommissionByOrder = asyncHandler(async (req, res) => {
    const commission = await commissionService.getCommissionByOrderId(
      req.params.id
    );
    return success(res, commission, 'Commission retrieved successfully');
  });

  /**
   * Get store's commissions (vendor endpoint)
   * @route GET /api/v1/commissions/store/:storeId
   */
  getStoreCommissions = asyncHandler(async (req, res) => {
    const { storeId } = req.params;
    const { transactions, pagination } = await commissionService.getStoreCommissions(
      storeId,
      req.query
    );
    return paginated(res, transactions, pagination, 'Store commissions retrieved successfully');
  });

  /**
   * Get store's commission summary
   * @route GET /api/v1/commissions/store/:storeId/summary
   */
  getStoreSummary = asyncHandler(async (req, res) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const summary = await commissionService.getStoreSummary(
      storeId,
      new Date(startDate),
      new Date(endDate)
    );
    
    return success(res, summary, 'Store summary retrieved successfully');
  });

  /**
   * Get all commissions (admin endpoint)
   * @route GET /api/v1/admin/commissions
   */
  getAllCommissions = asyncHandler(async (req, res) => {
    const { transactions, pagination } = await commissionService.getAllCommissions(
      req.query
    );
    return paginated(res, transactions, pagination, 'Commission records retrieved successfully');
  });

  /**
   * Get platform commission summary (admin endpoint)
   * @route GET /api/v1/admin/commissions/summary
   */
  getPlatformSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const summary = await commissionService.getPlatformSummary(
      new Date(startDate),
      new Date(endDate)
    );
    
    return success(res, summary, 'Platform summary retrieved successfully');
  });

  /**
   * Create or update commission settings (admin endpoint)
   * @route POST /api/v1/admin/commissions/settings
   */
  createOrUpdateSettings = asyncHandler(async (req, res) => {
    const settings = await commissionService.createOrUpdateSettings(req.body);
    return success(
      res,
      settings,
      'Commission settings saved successfully',
      201
    );
  });

  /**
   * Get commission settings
   * @route GET /api/v1/admin/commissions/settings/:storeId?
   */
  getSettings = asyncHandler(async (req, res) => {
    const { storeId } = req.params;
    const settings = await commissionService.getSettings(storeId || null);
    
    if (!settings) {
      return success(res, null, 'No commission settings found');
    }
    
    return success(res, settings, 'Commission settings retrieved successfully');
  });

  /**
   * Mark commission as paid (admin endpoint)
   * @route PATCH /api/v1/admin/commissions/:id/paid
   */
  markAsPaid = asyncHandler(async (req, res) => {
    const transaction = await commissionService.markAsPaid(
      req.params.id,
      req.body
    );
    return success(res, transaction, 'Commission marked as paid successfully');
  });

  /**
   * Initialize default settings (admin endpoint)
   * @route POST /api/v1/admin/commissions/initialize
   */
  initializeSettings = asyncHandler(async (req, res) => {
    const settings = await commissionService.initializeDefaultSettings();
    return success(
      res,
      settings,
      'Default commission settings initialized successfully',
      201
    );
  });
}

module.exports = new CommissionController();










