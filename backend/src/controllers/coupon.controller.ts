/**
 * Coupon Controller
 * Handles coupon-related operations
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types when services are fully typed
import _couponService from '../services/coupon.service';
const couponService = _couponService as any;

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

class CouponController {
  createCoupon = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const createdBy = authReq.user!.id;
    const coupon = await couponService.createCoupon(req.body, createdBy);
    return success(res, coupon, 'Coupon created successfully', 201);
  });

  getAllCoupons = asyncHandler(async (req: Request, res: Response) => {
    const { coupons, pagination } = await couponService.getAllCoupons(req.query);
    return paginated(res, coupons, pagination, 'Coupons retrieved successfully');
  });

  getActiveCoupons = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user ? authReq.user.id : null;
    const coupons = await couponService.getActiveCoupons(userId);
    return success(res, coupons, 'Active coupons retrieved successfully');
  });

  getCouponById = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.getCouponById(req.params.id);
    return success(res, coupon, 'Coupon retrieved successfully');
  });

  updateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    return success(res, coupon, 'Coupon updated successfully');
  });

  deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
    await couponService.deleteCoupon(req.params.id);
    return success(res, null, 'Coupon deleted successfully');
  });

  validateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { code, order_amount, user_id, store_id } = req.body;
    const result = await couponService.validateCoupon(code, {
      userId: user_id || (authReq.user ? authReq.user.id : null),
      orderAmount: order_amount || 0,
      storeId: store_id,
    });
    return success(res, result, 'Coupon is valid');
  });

  getCouponStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await couponService.getCouponStats(req.params.id);
    return success(res, stats, 'Coupon statistics retrieved successfully');
  });

  getUserCouponHistory = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;
    const history = await couponService.getUserCouponHistory(userId);
    return success(res, history, 'Coupon history retrieved successfully');
  });

  approveCoupon = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user!.id;
    const { notes } = req.body || {};
    const coupon = await couponService.approveCoupon(req.params.id, adminId, notes);
    return success(res, coupon, 'Coupon approved successfully');
  });

  rejectCoupon = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user!.id;
    const { reason } = req.body || {};
    const coupon = await couponService.rejectCoupon(req.params.id, adminId, reason);
    return success(res, coupon, 'Coupon rejected successfully');
  });

  enableCoupon = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.enableCoupon(req.params.id);
    return success(res, coupon, 'Coupon enabled successfully');
  });

  disableCoupon = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.disableCoupon(req.params.id);
    return success(res, coupon, 'Coupon disabled successfully');
  });
}

export = new CouponController();
