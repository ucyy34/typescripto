/**
 * Return Controller
 * Handles return request operations
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types
import _returnService from '../services/return.service';
const returnService = _returnService as any;

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

class ReturnController {
  createReturnRequest = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const returnRequest = await returnService.createReturnRequest(authReq.user!.id, req.body);
    return success(res, returnRequest, 'Return request created successfully', 201);
  });

  getUserReturns = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { returns, pagination } = await returnService.getUserReturnRequests(authReq.user!.id, req.query);
    return paginated(res, returns, pagination, 'Return requests retrieved successfully');
  });

  getReturnRequest = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const returnRequest = await returnService.getReturnRequestById(req.params.id, authReq.user!.id, authReq.user!.role);
    return success(res, returnRequest, 'Return request retrieved successfully');
  });

  updateReturnStatus = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const returnRequest = await returnService.updateReturnStatus(req.params.id, authReq.user!.id, authReq.user!.role, req.body);
    return success(res, returnRequest, `Return request status updated to ${req.body.status}`);
  });

  cancelReturnRequest = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const returnRequest = await returnService.cancelReturnRequest(req.params.id, authReq.user!.id, req.body.reason);
    return success(res, returnRequest, 'Return request cancelled successfully');
  });

  getStoreReturns = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { returns, pagination } = await returnService.getStoreReturnRequests(req.params.storeId, authReq.user!.id, req.query);
    return paginated(res, returns, pagination, 'Store return requests retrieved successfully');
  });
}

export = new ReturnController();
