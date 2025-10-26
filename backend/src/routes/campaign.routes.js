/**
 * Campaign Routes
 * Routes for campaign management
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

const campaignController = require('../controllers/campaign.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  campaignIdParamSchema,
  approveCampaignSchema,
} = require('../validators/campaign.validator');

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   GET /api/v1/campaigns/active
 * @desc    Get all active campaigns
 * @access  Public
 */
router.get('/active', campaignController.getActiveCampaigns);

/**
 * @route   GET /api/v1/campaigns/product/:productId
 * @desc    Get campaigns for a specific product
 * @access  Public
 */
router.get(
  '/product/:productId',
  validateParams(Joi.object({ productId: Joi.string().uuid().required() })),
  campaignController.getProductCampaigns
);

/**
 * @route   POST /api/v1/campaigns/:id/view
 * @desc    Increment campaign view count
 * @access  Public
 */
router.post(
  '/:id/view',
  validateParams(campaignIdParamSchema),
  campaignController.incrementViewCount
);

/**
 * @route   POST /api/v1/campaigns/:id/click
 * @desc    Increment campaign click count
 * @access  Public
 */
router.post(
  '/:id/click',
  validateParams(campaignIdParamSchema),
  campaignController.incrementClickCount
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   POST /api/v1/campaigns
 * @desc    Create new campaign (admin)
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createCampaignSchema),
  campaignController.createCampaign
);

/**
 * @route   GET /api/v1/campaigns
 * @desc    Get all campaigns (admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  validateQuery(campaignQuerySchema),
  campaignController.getAllCampaigns
);

/**
 * @route   GET /api/v1/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private (Admin)
 */
router.get(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(campaignIdParamSchema),
  campaignController.getCampaignById
);

/**
 * @route   PATCH /api/v1/campaigns/:id
 * @desc    Update campaign
 * @access  Private (Admin)
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(campaignIdParamSchema),
  validate(updateCampaignSchema),
  campaignController.updateCampaign
);

/**
 * @route   DELETE /api/v1/campaigns/:id
 * @desc    Delete campaign
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(campaignIdParamSchema),
  campaignController.deleteCampaign
);

/**
 * @route   PATCH /api/v1/campaigns/:id/approval
 * @desc    Approve or reject campaign
 * @access  Private (Admin)
 */
router.patch(
  '/:id/approval',
  authenticate,
  requireRole('admin'),
  validateParams(campaignIdParamSchema),
  validate(approveCampaignSchema),
  campaignController.approveCampaign
);

/**
 * @route   GET /api/v1/campaigns/:id/stats
 * @desc    Get campaign statistics
 * @access  Private (Admin)
 */
router.get(
  '/:id/stats',
  authenticate,
  requireRole('admin'),
  validateParams(campaignIdParamSchema),
  campaignController.getCampaignStats
);

module.exports = router;

