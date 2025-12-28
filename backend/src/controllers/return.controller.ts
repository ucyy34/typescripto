/**
 * Return Controller
 * Handles return request operations
 */

import { Request, Response } from 'express';

import returnService = require('../services/return.service');

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface ReturnRequestParams {
  id: string;
}

interface StoreParams {
  storeId: string;
}

interface ReturnItemPayload {
  order_item_id: string;
  quantity: number;
  item_reason?: string;
}

interface CreateReturnBody {
  order_id: string;
  reason: string;
  description: string;
  items: ReturnItemPayload[];
  images?: string[];
}

interface ReturnFiltersQuery {
  page?: string;
  limit?: string;
  status?: string;
  reason?: string;
}

interface UpdateReturnStatusBody {
  status: string;
  store_response?: string;
  tracking_number?: string;
  carrier?: string;
  cancellation_reason?: string;
  admin_notes?: string;
}

interface CancelReturnBody {
  reason: string;
}

class ReturnController {
  createReturnRequest = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, CreateReturnBody>, res: Response) => {
    const authReq = req;
    const returnRequest = await returnService.createReturnRequest(authReq.user!.id, req.body);
    return success(res, returnRequest, 'Return request created successfully', 201);
  });

  getUserReturns = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, unknown, ReturnFiltersQuery>, res: Response) => {
    const authReq = req;
    const { returns, pagination } = await returnService.getUserReturnRequests(authReq.user!.id, req.query);
    return paginated(res, returns, pagination, 'Return requests retrieved successfully');
  });

  getReturnRequest = asyncHandler(async (req: AuthenticatedRequest<ReturnRequestParams>, res: Response) => {
    const authReq = req;
    const returnRequest = await returnService.getReturnRequestById(req.params.id, authReq.user!.id, authReq.user!.role);
    return success(res, returnRequest, 'Return request retrieved successfully');
  });

  updateReturnStatus = asyncHandler(async (req: AuthenticatedRequest<ReturnRequestParams, unknown, UpdateReturnStatusBody>, res: Response) => {
    const authReq = req;
    const returnRequest = await returnService.updateReturnStatus(req.params.id, authReq.user!.id, authReq.user!.role, req.body);
    return success(res, returnRequest, `Return request status updated to ${req.body.status}`);
  });

  cancelReturnRequest = asyncHandler(async (req: AuthenticatedRequest<ReturnRequestParams, unknown, CancelReturnBody>, res: Response) => {
    const authReq = req;
    const returnRequest = await returnService.cancelReturnRequest(req.params.id, authReq.user!.id, req.body.reason);
    return success(res, returnRequest, 'Return request cancelled successfully');
  });

  getStoreReturns = asyncHandler(async (req: AuthenticatedRequest<StoreParams, unknown, unknown, ReturnFiltersQuery>, res: Response) => {
    const authReq = req;
    const { returns, pagination } = await returnService.getStoreReturnRequests(req.params.storeId, authReq.user!.id, req.query);
    return paginated(res, returns, pagination, 'Store return requests retrieved successfully');
  });
}

export = new ReturnController();
