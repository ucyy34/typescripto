/**
 * Campaign Controller
 * Handles campaign-related HTTP requests
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types
import _campaignService from '../services/campaign.service';
const campaignService = _campaignService as any;

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
  store?: { id: string };
}

class CampaignController {
  createCampaign = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user!.role === 'seller') {
      const resolvedStoreId = req.params.storeId || authReq.store?.id;
      if (resolvedStoreId) {
        req.body.store_id = resolvedStoreId;
      }
    }
    const campaign = await campaignService.createCampaign(req.body, authReq.user!.id, authReq.user!.role);
    const message = authReq.user!.role === 'seller' ? 'Campaign created successfully and sent for approval' : 'Campaign created successfully';
    return success(res, campaign, message, 201);
  });

  getAllCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { campaigns, pagination } = await campaignService.getAllCampaigns(req.query, authReq.user!.role, authReq.user!.id);
    return paginated(res, campaigns, pagination, 'Campaigns retrieved successfully');
  });

  getActiveCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const campaigns = await campaignService.getActiveCampaigns(req.query);
    return success(res, campaigns, 'Active campaigns retrieved successfully');
  });

  getProductCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const campaigns = await campaignService.getCampaignsForProduct(req.params.productId);
    return success(res, campaigns, 'Product campaigns retrieved successfully');
  });

  getCampaignById = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const campaign = await campaignService.getCampaignById(req.params.id, authReq.user!.role, authReq.user!.id);
    return success(res, campaign, 'Campaign retrieved successfully');
  });

  updateCampaign = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const campaign = await campaignService.updateCampaign(req.params.id, req.body, authReq.user!.role, authReq.user!.id);
    return success(res, campaign, 'Campaign updated successfully');
  });

  deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await campaignService.deleteCampaign(req.params.id, authReq.user!.role, authReq.user!.id);
    return success(res, null, 'Campaign deleted successfully');
  });

  approveCampaign = asyncHandler(async (req: Request, res: Response) => {
    const campaign = await campaignService.approveCampaign(req.params.id, req.body);
    const message = req.body.approval_status === 'approved' ? 'Campaign approved successfully' : 'Campaign rejected';
    return success(res, campaign, message);
  });

  getCampaignStats = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const stats = await campaignService.getCampaignStats(req.params.id, authReq.user!.role, authReq.user!.id);
    return success(res, stats, 'Campaign statistics retrieved successfully');
  });

  incrementViewCount = asyncHandler(async (req: Request, res: Response) => {
    await campaignService.incrementViewCount(req.params.id);
    return success(res, null, 'View recorded');
  });

  incrementClickCount = asyncHandler(async (req: Request, res: Response) => {
    await campaignService.incrementClickCount(req.params.id);
    return success(res, null, 'Click recorded');
  });
}

export = new CampaignController();
