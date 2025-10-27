/**
 * Coupon Controller
 * Handles coupon-related operations
 */

const couponService = require('../services/coupon.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class CouponController {
  /**
   * Create new coupon (admin)
   * @route POST /api/v1/coupons
   */
  createCoupon = asyncHandler(async (req, res) => {
    const createdBy = req.user.id;
    const coupon = await couponService.createCoupon(req.body, createdBy);
    
    return success(res, coupon, 'Coupon created successfully', 201);
  });

  /**
   * Get all coupons (admin)
   * @route GET /api/v1/coupons
   */
  getAllCoupons = asyncHandler(async (req, res) => {
    const { coupons, pagination } = await couponService.getAllCoupons(req.query);
    
    return paginated(res, coupons, pagination, 'Coupons retrieved successfully');
  });

  /**
   * Get active coupons (public/user)
   * @route GET /api/v1/coupons/active
   */
  getActiveCoupons = asyncHandler(async (req, res) => {
    const userId = req.user ? req.user.id : null;
    const coupons = await couponService.getActiveCoupons(userId);
    
    return success(res, coupons, 'Active coupons retrieved successfully');
  });

  /**
   * Get coupon by ID (admin)
   * @route GET /api/v1/coupons/:id
   */
  getCouponById = asyncHandler(async (req, res) => {
    const coupon = await couponService.getCouponById(req.params.id);
    
    return success(res, coupon, 'Coupon retrieved successfully');
  });

  /**
   * Update coupon (admin)
   * @route PATCH /api/v1/coupons/:id
   */
  updateCoupon = asyncHandler(async (req, res) => {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    
    return success(res, coupon, 'Coupon updated successfully');
  });

  /**
   * Delete coupon (admin)
   * @route DELETE /api/v1/coupons/:id
   */
  deleteCoupon = asyncHandler(async (req, res) => {
    await couponService.deleteCoupon(req.params.id);
    
    return success(res, null, 'Coupon deleted successfully');
  });

  /**
   * Validate coupon code
   * @route POST /api/v1/coupons/validate
   */
  validateCoupon = asyncHandler(async (req, res) => {
    const { code, order_amount, user_id, store_id } = req.body;
    
    const result = await couponService.validateCoupon(code, {
      userId: user_id || (req.user ? req.user.id : null),
      orderAmount: order_amount || 0,
      storeId: store_id,
    });
    
    return success(res, result, 'Coupon is valid');
  });

  /**
   * Get coupon statistics (admin)
   * @route GET /api/v1/coupons/:id/stats
   */
  getCouponStats = asyncHandler(async (req, res) => {
    const stats = await couponService.getCouponStats(req.params.id);
    
    return success(res, stats, 'Coupon statistics retrieved successfully');
  });

  /**
   * Get user's coupon history
   * @route GET /api/v1/coupons/my-history
   */
  getUserCouponHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const history = await couponService.getUserCouponHistory(userId);
    
    return success(res, history, 'Coupon history retrieved successfully');
  });

  /**
   * Approve coupon (admin)
   * @route PATCH /api/v1/coupons/:id/approve
   */
  approveCoupon = asyncHandler(async (req, res) => {
    const adminId = req.user.id;
    const { notes } = req.body || {};
    const coupon = await couponService.approveCoupon(req.params.id, adminId, notes);
    return success(res, coupon, 'Coupon approved successfully');
  });

  /**
   * Reject coupon (admin)
   * @route PATCH /api/v1/coupons/:id/reject
   */
  rejectCoupon = asyncHandler(async (req, res) => {
    const adminId = req.user.id;
    const { reason } = req.body || {};
    const coupon = await couponService.rejectCoupon(req.params.id, adminId, reason);
    return success(res, coupon, 'Coupon rejected successfully');
  });

  /**
   * Enable coupon (admin)
   * @route PATCH /api/v1/coupons/:id/enable
   */
  enableCoupon = asyncHandler(async (req, res) => {
    const coupon = await couponService.enableCoupon(req.params.id);
    return success(res, coupon, 'Coupon enabled successfully');
  });

  /**
   * Disable coupon (admin)
   * @route PATCH /api/v1/coupons/:id/disable
   */
  disableCoupon = asyncHandler(async (req, res) => {
    const coupon = await couponService.disableCoupon(req.params.id);
    return success(res, coupon, 'Coupon disabled successfully');
  });
}

module.exports = new CouponController();








