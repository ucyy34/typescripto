/**
 * Commission Controller
 * Handles commission-related operations
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types
import _commissionService from '../services/commission.service';
const commissionService = _commissionService as any;

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

class CommissionController {
  getCommissionByOrder = asyncHandler(async (req: Request, res: Response) => {
    const commission = await commissionService.getCommissionByOrderId(req.params.id);
    return success(res, commission, 'Commission retrieved successfully');
  });

  getStoreCommissions = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { transactions, pagination } = await commissionService.getStoreCommissions(storeId, req.query);
    return paginated(res, transactions, pagination, 'Store commissions retrieved successfully');
  });

  getStoreSummary = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;
    const summary = await commissionService.getStoreSummary(storeId, new Date(startDate as string), new Date(endDate as string));
    return success(res, summary, 'Store summary retrieved successfully');
  });

  getAllCommissions = asyncHandler(async (req: Request, res: Response) => {
    const { transactions, pagination } = await commissionService.getAllCommissions(req.query);
    return paginated(res, transactions, pagination, 'Commission transactions retrieved successfully');
  });

  getPlatformSummary = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const summary = await commissionService.getPlatformSummary(new Date(startDate as string), new Date(endDate as string));
    return success(res, summary, 'Platform summary retrieved successfully');
  });

  createOrUpdateSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await commissionService.createOrUpdateSettings(req.body);
    return success(res, settings, 'Commission settings saved successfully', 201);
  });

  getSettings = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const settings = await commissionService.getSettings(storeId || null);
    if (!settings) {
      return success(res, null, 'No commission settings found');
    }
    return success(res, settings, 'Commission settings retrieved successfully');
  });

  markAsPaid = asyncHandler(async (req: Request, res: Response) => {
    const transaction = await commissionService.markAsPaid(req.params.id, req.body);
    return success(res, transaction, 'Commission marked as paid successfully');
  });

  initializeSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await commissionService.initializeDefaultSettings();
    return success(res, settings, 'Default commission settings initialized successfully', 201);
  });
}

export = new CommissionController();
