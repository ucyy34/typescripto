/**
 * Review Controller
 * Handles review-related HTTP requests
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types
import _reviewService from '../services/review.service';
const reviewService = _reviewService as any;

import { success, created } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

const reviewController = {
  getProductReviews: asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { page = '1', limit = '10', sort = 'recent' } = req.query;
    const result = await reviewService.getProductReviews(productId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort,
    });
    return success(res, result, 'Product reviews retrieved successfully');
  }),

  getStoreReviews: asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { page = '1', limit = '10' } = req.query;
    const result = await reviewService.getStoreReviews(storeId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
    return success(res, result, 'Store reviews retrieved successfully');
  }),

  createProductReview: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { productId } = req.params;
    const userId = authReq.user!.id;
    const review = await reviewService.createProductReview(userId, productId, req.body);
    return created(res, review, 'Review created successfully');
  }),

  updateReview: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const review = await reviewService.updateReview(id, authReq.user!.id, req.body);
    return success(res, review, 'Review updated successfully');
  }),

  deleteReview: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    await reviewService.deleteReview(id, authReq.user!.id);
    return success(res, null, 'Review deleted successfully');
  }),

  markHelpful: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { helpful = true } = req.body;
    const review = await reviewService.markHelpful(id, authReq.user!.id, helpful);
    return success(res, review, 'Review feedback recorded');
  }),

  getPendingReviews: asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '20' } = req.query;
    const result = await reviewService.getPendingReviews({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
    return success(res, result, 'Pending reviews retrieved successfully');
  }),

  approveReview: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const review = await reviewService.approveReview(id, authReq.user!.id);
    return success(res, review, 'Review approved successfully');
  }),

  rejectReview: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { reason } = req.body;
    const review = await reviewService.rejectReview(id, authReq.user!.id, reason);
    return success(res, review, 'Review rejected successfully');
  }),
};

export = reviewController;
