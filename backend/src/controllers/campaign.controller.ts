/**
 * Campaign Controller
 * Handles campaign-related HTTP requests
 */

import { Request, Response } from 'express';

import campaignService = require('../services/campaign.service');

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface CampaignParams {
  id: string;
}

interface StoreParams {
  storeId: string;
}

interface ProductParams {
  productId: string;
}

interface CampaignQuery {
  page?: string;
  limit?: string;
  campaign_type?: string;
  is_active?: string;
  approval_status?: string;
  store_id?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}

class CampaignController {
  createCampaign = asyncHandler(async (req: AuthenticatedRequest<StoreParams, unknown, Record<string, unknown>>, res: Response) => {
    const authReq = req as AuthenticatedRequest & { store?: { id: string } };
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

  getAllCampaigns = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, unknown, CampaignQuery>, res: Response) => {
    const authReq = req;
    const { campaigns, pagination } = await campaignService.getAllCampaigns(req.query, authReq.user!.role, authReq.user!.id);
    return paginated(res, campaigns, pagination, 'Campaigns retrieved successfully');
  });

  getActiveCampaigns = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, CampaignQuery>, res: Response) => {
    const campaigns = await campaignService.getActiveCampaigns(req.query);
    return success(res, campaigns, 'Active campaigns retrieved successfully');
  });

  getProductCampaigns = asyncHandler(async (req: Request<ProductParams>, res: Response) => {
    const campaigns = await campaignService.getCampaignsForProduct(req.params.productId);
    return success(res, campaigns, 'Product campaigns retrieved successfully');
  });

  getCampaignById = asyncHandler(async (req: AuthenticatedRequest<CampaignParams>, res: Response) => {
    const authReq = req;
    const campaign = await campaignService.getCampaignById(req.params.id, authReq.user!.role, authReq.user!.id);
    return success(res, campaign, 'Campaign retrieved successfully');
  });

  updateCampaign = asyncHandler(async (req: AuthenticatedRequest<CampaignParams, unknown, Record<string, unknown>>, res: Response) => {
    const authReq = req;
    const campaign = await campaignService.updateCampaign(req.params.id, req.body, authReq.user!.role, authReq.user!.id);
    return success(res, campaign, 'Campaign updated successfully');
  });

  deleteCampaign = asyncHandler(async (req: AuthenticatedRequest<CampaignParams>, res: Response) => {
    const authReq = req;
    await campaignService.deleteCampaign(req.params.id, authReq.user!.role, authReq.user!.id);
    return success(res, null, 'Campaign deleted successfully');
  });

  approveCampaign = asyncHandler(async (req: Request<CampaignParams, unknown, { approval_status?: string }>, res: Response) => {
    const campaign = await campaignService.approveCampaign(req.params.id, req.body);
    const message = req.body.approval_status === 'approved' ? 'Campaign approved successfully' : 'Campaign rejected';
    return success(res, campaign, message);
  });

  getCampaignStats = asyncHandler(async (req: AuthenticatedRequest<CampaignParams>, res: Response) => {
    const authReq = req;
    const stats = await campaignService.getCampaignStats(req.params.id, authReq.user!.role, authReq.user!.id);
    return success(res, stats, 'Campaign statistics retrieved successfully');
  });

  incrementViewCount = asyncHandler(async (req: Request<CampaignParams>, res: Response) => {
    await campaignService.incrementViewCount(req.params.id);
    return success(res, null, 'View recorded');
  });

  incrementClickCount = asyncHandler(async (req: Request<CampaignParams>, res: Response) => {
    await campaignService.incrementClickCount(req.params.id);
    return success(res, null, 'Click recorded');
  });
}

export = new CampaignController();
