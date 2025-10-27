/**
 * Return Controller
 * Handles return request operations
 */

const returnService = require('../services/return.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class ReturnController {
  /**
   * Create new return request
   * @route POST /api/v1/returns
   */
  createReturnRequest = asyncHandler(async (req, res) => {
    const returnRequest = await returnService.createReturnRequest(req.user.id, req.body);
    return success(res, returnRequest, 'Return request created successfully', 201);
  });

  /**
   * Get user's return requests
   * @route GET /api/v1/returns
   */
  getUserReturns = asyncHandler(async (req, res) => {
    const { returns, pagination } = await returnService.getUserReturnRequests(
      req.user.id,
      req.query
    );
    return paginated(res, returns, pagination, 'Return requests retrieved successfully');
  });

  /**
   * Get return request by ID
   * @route GET /api/v1/returns/:id
   */
  getReturnRequest = asyncHandler(async (req, res) => {
    const returnRequest = await returnService.getReturnRequestById(
      req.params.id,
      req.user.id,
      req.user.role
    );
    return success(res, returnRequest, 'Return request retrieved successfully');
  });

  /**
   * Update return request status
   * @route PATCH /api/v1/returns/:id/status
   */
  updateReturnStatus = asyncHandler(async (req, res) => {
    const returnRequest = await returnService.updateReturnStatus(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body
    );
    return success(res, returnRequest, `Return request status updated to ${req.body.status}`);
  });

  /**
   * Cancel return request
   * @route POST /api/v1/returns/:id/cancel
   */
  cancelReturnRequest = asyncHandler(async (req, res) => {
    const returnRequest = await returnService.cancelReturnRequest(
      req.params.id,
      req.user.id,
      req.body.reason
    );
    return success(res, returnRequest, 'Return request cancelled successfully');
  });

  /**
   * Get store's return requests (seller only)
   * @route GET /api/v1/stores/:storeId/returns
   */
  getStoreReturns = asyncHandler(async (req, res) => {
    const { returns, pagination } = await returnService.getStoreReturnRequests(
      req.params.storeId,
      req.user.id,
      req.query
    );
    return paginated(res, returns, pagination, 'Store return requests retrieved successfully');
  });
}

module.exports = new ReturnController();










