/**
 * Coupon Controller
 * Handles coupon-related operations
 */

import { Request, Response } from 'express';

import couponService = require('../services/coupon.service');

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface CouponIdParams {
  id: string;
}

interface CouponQuery {
  page?: string;
  limit?: string;
  is_active?: string;
  discount_type?: string;
  search?: string;
}

interface ValidateCouponBody {
  code: string;
  order_amount?: number;
  user_id?: string;
  store_id?: string;
}

class CouponController {
  createCoupon = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, Record<string, unknown>>, res: Response) => {
    const authReq = req;
    const createdBy = authReq.user!.id;
    const coupon = await couponService.createCoupon(req.body, createdBy);
    return success(res, coupon, 'Coupon created successfully', 201);
  });

  getAllCoupons = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, CouponQuery>, res: Response) => {
    const { coupons, pagination } = await couponService.getAllCoupons(req.query);
    return paginated(res, coupons, pagination, 'Coupons retrieved successfully');
  });

  getActiveCoupons = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req;
    const userId = authReq.user ? authReq.user.id : null;
    const coupons = await couponService.getActiveCoupons(userId);
    return success(res, coupons, 'Active coupons retrieved successfully');
  });

  getCouponById = asyncHandler(async (req: Request<CouponIdParams>, res: Response) => {
    const coupon = await couponService.getCouponById(req.params.id);
    return success(res, coupon, 'Coupon retrieved successfully');
  });

  updateCoupon = asyncHandler(async (req: Request<CouponIdParams, unknown, Record<string, unknown>>, res: Response) => {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    return success(res, coupon, 'Coupon updated successfully');
  });

  deleteCoupon = asyncHandler(async (req: Request<CouponIdParams>, res: Response) => {
    await couponService.deleteCoupon(req.params.id);
    return success(res, null, 'Coupon deleted successfully');
  });

  validateCoupon = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, ValidateCouponBody>, res: Response) => {
    const authReq = req;
    const { code, order_amount, user_id, store_id } = req.body;
    const result = await couponService.validateCoupon(code, {
      userId: user_id || (authReq.user ? authReq.user.id : null),
      orderAmount: order_amount || 0,
      storeId: store_id,
    });
    return success(res, result, 'Coupon is valid');
  });

  getCouponStats = asyncHandler(async (req: Request<CouponIdParams>, res: Response) => {
    const stats = await couponService.getCouponStats(req.params.id);
    return success(res, stats, 'Coupon statistics retrieved successfully');
  });

  getUserCouponHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req;
    const userId = authReq.user!.id;
    const history = await couponService.getUserCouponHistory(userId);
    return success(res, history, 'Coupon history retrieved successfully');
  });

  approveCoupon = asyncHandler(async (req: AuthenticatedRequest<CouponIdParams, unknown, { notes?: string }>, res: Response) => {
    const authReq = req;
    const adminId = authReq.user!.id;
    const { notes } = req.body || {};
    const coupon = await couponService.approveCoupon(req.params.id, adminId, notes);
    return success(res, coupon, 'Coupon approved successfully');
  });

  rejectCoupon = asyncHandler(async (req: AuthenticatedRequest<CouponIdParams, unknown, { reason?: string }>, res: Response) => {
    const authReq = req;
    const adminId = authReq.user!.id;
    const { reason } = req.body || {};
    const coupon = await couponService.rejectCoupon(req.params.id, adminId, reason);
    return success(res, coupon, 'Coupon rejected successfully');
  });

  enableCoupon = asyncHandler(async (req: Request<CouponIdParams>, res: Response) => {
    const coupon = await couponService.enableCoupon(req.params.id);
    return success(res, coupon, 'Coupon enabled successfully');
  });

  disableCoupon = asyncHandler(async (req: Request<CouponIdParams>, res: Response) => {
    const coupon = await couponService.disableCoupon(req.params.id);
    return success(res, coupon, 'Coupon disabled successfully');
  });
}

export = new CouponController();
