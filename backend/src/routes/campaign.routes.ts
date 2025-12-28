/**
 * Campaign Routes
 * Routes for campaign management
 */

import { Router } from 'express';
import Joi from 'joi';

import campaignController from '../controllers/campaign.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate, validateParams, validateQuery } from '../middlewares/validate';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  campaignIdParamSchema,
  approveCampaignSchema,
} from '../validators/campaign.validator';

const router: Router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

router.get('/active', campaignController.getActiveCampaigns);

router.get(
  '/product/:productId',
  validateParams(Joi.object({ productId: Joi.string().uuid().required() })),
  campaignController.getProductCampaigns
);

router.post('/:id/view', validateParams(campaignIdParamSchema), campaignController.incrementViewCount);

router.post('/:id/click', validateParams(campaignIdParamSchema), campaignController.incrementClickCount);

// ============================================
// ADMIN ROUTES
// ============================================

router.post('/', authenticate, requireRole('admin'), validate(createCampaignSchema), campaignController.createCampaign);

router.get('/', authenticate, requireRole('admin'), validateQuery(campaignQuerySchema), campaignController.getAllCampaigns);

router.get('/:id', authenticate, requireRole('admin'), validateParams(campaignIdParamSchema), campaignController.getCampaignById);

router.patch('/:id', authenticate, requireRole('admin'), validateParams(campaignIdParamSchema), validate(updateCampaignSchema), campaignController.updateCampaign);

router.delete('/:id', authenticate, requireRole('admin'), validateParams(campaignIdParamSchema), campaignController.deleteCampaign);

router.patch('/:id/approval', authenticate, requireRole('admin'), validateParams(campaignIdParamSchema), validate(approveCampaignSchema), campaignController.approveCampaign);

router.get('/:id/stats', authenticate, requireRole('admin'), validateParams(campaignIdParamSchema), campaignController.getCampaignStats);

export = router;
