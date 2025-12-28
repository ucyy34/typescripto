/**
 * Store Campaign Routes (Vendor)
 * Routes for vendor campaign management
 */

import { Router } from 'express';

import campaignController from '../controllers/campaign.controller';
import { authenticate, requireRole, validateStoreOwnership } from '../middlewares/auth';
import { validate, validateParams, validateQuery } from '../middlewares/validate';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  campaignIdParamSchema,
} from '../validators/campaign.validator';

const router: Router = Router({ mergeParams: true }); // To access :storeId from parent

// All routes require authentication and seller role
router.use(authenticate);
router.use(requireRole('seller'));
router.use(validateStoreOwnership);

router.post('/', validate(createCampaignSchema), campaignController.createCampaign);
router.get('/', validateQuery(campaignQuerySchema), campaignController.getAllCampaigns);
router.get('/:id', validateParams(campaignIdParamSchema), campaignController.getCampaignById);
router.patch('/:id', validateParams(campaignIdParamSchema), validate(updateCampaignSchema), campaignController.updateCampaign);
router.delete('/:id', validateParams(campaignIdParamSchema), campaignController.deleteCampaign);
router.get('/:id/stats', validateParams(campaignIdParamSchema), campaignController.getCampaignStats);

export = router;
