/**
 * Campaign Controller
 * Handles campaign-related HTTP requests
 */

const campaignService = require('../services/campaign.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class CampaignController {
  /**
   * Create new campaign
   * @route POST /api/v1/campaigns (admin)
   * @route POST /api/v1/stores/:storeId/campaigns (vendor)
  */
  createCampaign = asyncHandler(async (req, res) => {
    if (req.user.role === 'seller') {
      // Ensure seller campaigns are always tied to the store in the route params
      const resolvedStoreId = req.params.storeId || req.store?.id;

      if (resolvedStoreId) {
        req.body.store_id = resolvedStoreId;
      }
    }

    const campaign = await campaignService.createCampaign(
      req.body,
      req.user.id,
      req.user.role
    );

    const message = req.user.role === 'seller'
      ? 'Campaign created successfully and sent for approval'
      : 'Campaign created successfully';

    return success(res, campaign, message, 201);
  });

  /**
   * Get all campaigns
   * @route GET /api/v1/campaigns (admin)
   * @route GET /api/v1/stores/:storeId/campaigns (vendor)
   */
  getAllCampaigns = asyncHandler(async (req, res) => {
    const { campaigns, pagination } = await campaignService.getAllCampaigns(
      req.query,
      req.user.role,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      data: campaigns,
      pagination,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get active campaigns (public)
   * @route GET /api/v1/campaigns/active
   */
  getActiveCampaigns = asyncHandler(async (req, res) => {
    const campaigns = await campaignService.getActiveCampaigns(req.query);
    return success(res, campaigns, 'Active campaigns retrieved successfully');
  });

  /**
   * Get campaigns for a specific product (public)
   * @route GET /api/v1/campaigns/product/:productId
   */
  getProductCampaigns = asyncHandler(async (req, res) => {
    const campaigns = await campaignService.getCampaignsForProduct(req.params.productId);
    return success(res, campaigns, 'Product campaigns retrieved successfully');
  });

  /**
   * Get campaign by ID
   * @route GET /api/v1/campaigns/:id
   */
  getCampaignById = asyncHandler(async (req, res) => {
    const campaign = await campaignService.getCampaignById(
      req.params.id,
      req.user.role,
      req.user.id
    );
    return success(res, campaign, 'Campaign retrieved successfully');
  });

  /**
   * Update campaign
   * @route PATCH /api/v1/campaigns/:id
   */
  updateCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.updateCampaign(
      req.params.id,
      req.body,
      req.user.role,
      req.user.id
    );
    return success(res, campaign, 'Campaign updated successfully');
  });

  /**
   * Delete campaign
   * @route DELETE /api/v1/campaigns/:id
   */
  deleteCampaign = asyncHandler(async (req, res) => {
    await campaignService.deleteCampaign(
      req.params.id,
      req.user.role,
      req.user.id
    );
    return success(res, null, 'Campaign deleted successfully');
  });

  /**
   * Approve or reject campaign (admin only)
   * @route PATCH /api/v1/campaigns/:id/approval
   */
  approveCampaign = asyncHandler(async (req, res) => {
    const campaign = await campaignService.approveCampaign(req.params.id, req.body);
    
    const message = req.body.approval_status === 'approved'
      ? 'Campaign approved successfully'
      : 'Campaign rejected';

    return success(res, campaign, message);
  });

  /**
   * Get campaign statistics
   * @route GET /api/v1/campaigns/:id/stats
   */
  getCampaignStats = asyncHandler(async (req, res) => {
    const stats = await campaignService.getCampaignStats(
      req.params.id,
      req.user.role,
      req.user.id
    );
    return success(res, stats, 'Campaign statistics retrieved successfully');
  });

  /**
   * Increment campaign view count (public)
   * @route POST /api/v1/campaigns/:id/view
   */
  incrementViewCount = asyncHandler(async (req, res) => {
    await campaignService.incrementViewCount(req.params.id);
    return success(res, null, 'View recorded');
  });

  /**
   * Increment campaign click count (public)
   * @route POST /api/v1/campaigns/:id/click
   */
  incrementClickCount = asyncHandler(async (req, res) => {
    await campaignService.incrementClickCount(req.params.id);
    return success(res, null, 'Click recorded');
  });
}

module.exports = new CampaignController();




