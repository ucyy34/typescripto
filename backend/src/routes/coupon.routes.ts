/**
 * Coupon Routes
 * Routes for coupon management
 */

import { Router } from 'express';

import couponController from '../controllers/coupon.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate, validateParams, validateQuery } from '../middlewares/validate';
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponQuerySchema,
  couponIdParamSchema,
} from '../validators/coupon.validator';

const router: Router = Router();

// ============================================
// PUBLIC/USER ROUTES
// ============================================

router.get('/active', couponController.getActiveCoupons);

router.post('/validate', validate(validateCouponSchema), couponController.validateCoupon);

router.get('/my-history', authenticate, couponController.getUserCouponHistory);

// ============================================
// ADMIN ROUTES
// ============================================

router.post('/', authenticate, requireRole('admin'), validate(createCouponSchema), couponController.createCoupon);

router.get('/', authenticate, requireRole('admin'), validateQuery(couponQuerySchema), couponController.getAllCoupons);

router.get('/:id', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), couponController.getCouponById);

router.patch('/:id', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), validate(updateCouponSchema), couponController.updateCoupon);

router.delete('/:id', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), couponController.deleteCoupon);

router.patch('/:id/approve', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), couponController.approveCoupon);

router.patch('/:id/reject', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), couponController.rejectCoupon);

router.patch('/:id/enable', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), couponController.enableCoupon);

router.patch('/:id/disable', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), couponController.disableCoupon);

router.get('/:id/stats', authenticate, requireRole('admin'), validateParams(couponIdParamSchema), couponController.getCouponStats);

export = router;
