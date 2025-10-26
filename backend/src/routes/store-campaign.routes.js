/**
 * Store Campaign Routes (Vendor)
 * Routes for vendor campaign management
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // To access :storeId from parent

const campaignController = require('../controllers/campaign.controller');
const { authenticate, requireRole, validateStoreOwnership } = require('../middlewares/auth');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  campaignIdParamSchema,
} = require('../validators/campaign.validator');

// All routes require authentication and seller role
router.use(authenticate);
router.use(requireRole('seller'));
router.use(validateStoreOwnership);

/**
 * @route   POST /api/v1/stores/:storeId/campaigns
 * @desc    Create new campaign for store
 * @access  Private (Seller)
 */
router.post(
  '/',
  validate(createCampaignSchema),
  campaignController.createCampaign
);

/**
 * @route   GET /api/v1/stores/:storeId/campaigns
 * @desc    Get all campaigns for store
 * @access  Private (Seller)
 */
router.get(
  '/',
  validateQuery(campaignQuerySchema),
  campaignController.getAllCampaigns
);

/**
 * @route   GET /api/v1/stores/:storeId/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private (Seller)
 */
router.get(
  '/:id',
  validateParams(campaignIdParamSchema),
  campaignController.getCampaignById
);

/**
 * @route   PATCH /api/v1/stores/:storeId/campaigns/:id
 * @desc    Update campaign
 * @access  Private (Seller)
 */
router.patch(
  '/:id',
  validateParams(campaignIdParamSchema),
  validate(updateCampaignSchema),
  campaignController.updateCampaign
);

/**
 * @route   DELETE /api/v1/stores/:storeId/campaigns/:id
 * @desc    Delete campaign
 * @access  Private (Seller)
 */
router.delete(
  '/:id',
  validateParams(campaignIdParamSchema),
  campaignController.deleteCampaign
);

/**
 * @route   GET /api/v1/stores/:storeId/campaigns/:id/stats
 * @desc    Get campaign statistics
 * @access  Private (Seller)
 */
router.get(
  '/:id/stats',
  validateParams(campaignIdParamSchema),
  campaignController.getCampaignStats
);

module.exports = router;




