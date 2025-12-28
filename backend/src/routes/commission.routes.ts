/**
 * Commission Routes
 * Routes for commission management
 */

import { Router } from 'express';

import commissionController from '../controllers/commission.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate, validateParams, validateQuery } from '../middlewares/validate';
import {
  commissionSettingsSchema,
  commissionQuerySchema,
  summaryQuerySchema,
  markAsPaidSchema,
  uuidParamSchema,
  storeIdParamSchema,
} from '../validators/commission.validator';

const router: Router = Router();

// Vendor/Seller routes
router.get('/store/:storeId', authenticate, requireRole('seller', 'admin'), validateParams(storeIdParamSchema), validateQuery(commissionQuerySchema), commissionController.getStoreCommissions);
router.get('/store/:storeId/summary', authenticate, requireRole('seller', 'admin'), validateParams(storeIdParamSchema), validateQuery(summaryQuerySchema), commissionController.getStoreSummary);
router.get('/order/:id', authenticate, requireRole('seller', 'admin'), validateParams(uuidParamSchema), commissionController.getCommissionByOrder);

// Admin routes
router.get('/admin/all', authenticate, requireRole('admin'), validateQuery(commissionQuerySchema), commissionController.getAllCommissions);
router.get('/admin/summary', authenticate, requireRole('admin'), validateQuery(summaryQuerySchema), commissionController.getPlatformSummary);
router.post('/admin/settings', authenticate, requireRole('admin'), validate(commissionSettingsSchema), commissionController.createOrUpdateSettings);
router.get('/admin/settings/:storeId?', authenticate, requireRole('admin'), commissionController.getSettings);
router.patch('/admin/:id/paid', authenticate, requireRole('admin'), validateParams(uuidParamSchema), validate(markAsPaidSchema), commissionController.markAsPaid);
router.post('/admin/initialize', authenticate, requireRole('admin'), commissionController.initializeSettings);

export = router;
