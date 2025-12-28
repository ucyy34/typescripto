/**
 * Review Controller
 * Handles review-related HTTP requests
 */

import { Request, Response } from 'express';

import reviewService = require('../services/review.service');

import { success, created } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface ReviewParams {
  id: string;
}

interface ProductParams {
  productId: string;
}

interface StoreParams {
  storeId: string;
}

interface ReviewQuery {
  page?: string;
  limit?: string;
  sort?: 'recent' | 'highest' | 'lowest' | 'helpful';
}

interface ReviewBody {
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

interface ReviewUpdateBody {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
}

interface HelpfulBody {
  helpful?: boolean;
}

interface RejectBody {
  reason: string;
}

const reviewController = {
  getProductReviews: asyncHandler(async (req: Request<ProductParams, unknown, unknown, ReviewQuery>, res: Response) => {
    const { productId } = req.params;
    const { page = '1', limit = '10', sort = 'recent' } = req.query;
    const result = await reviewService.getProductReviews(productId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort,
    });
    return success(res, result, 'Product reviews retrieved successfully');
  }),

  getStoreReviews: asyncHandler(async (req: Request<StoreParams, unknown, unknown, ReviewQuery>, res: Response) => {
    const { storeId } = req.params;
    const { page = '1', limit = '10' } = req.query;
    const result = await reviewService.getStoreReviews(storeId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
    return success(res, result, 'Store reviews retrieved successfully');
  }),

  createProductReview: asyncHandler(async (req: AuthenticatedRequest<ProductParams, unknown, ReviewBody>, res: Response) => {
    const authReq = req;
    const { productId } = req.params;
    const userId = authReq.user!.id;
    const review = await reviewService.createProductReview(userId, productId, req.body);
    return created(res, review, 'Review created successfully');
  }),

  updateReview: asyncHandler(async (req: AuthenticatedRequest<ReviewParams, unknown, ReviewUpdateBody>, res: Response) => {
    const authReq = req;
    const { id } = req.params;
    const review = await reviewService.updateReview(id, authReq.user!.id, req.body);
    return success(res, review, 'Review updated successfully');
  }),

  deleteReview: asyncHandler(async (req: AuthenticatedRequest<ReviewParams>, res: Response) => {
    const authReq = req;
    const { id } = req.params;
    await reviewService.deleteReview(id, authReq.user!.id);
    return success(res, null, 'Review deleted successfully');
  }),

  markHelpful: asyncHandler(async (req: AuthenticatedRequest<ReviewParams, unknown, HelpfulBody>, res: Response) => {
    const authReq = req;
    const { id } = req.params;
    const { helpful = true } = req.body;
    const review = await reviewService.markHelpful(id, authReq.user!.id, helpful);
    return success(res, review, 'Review feedback recorded');
  }),

  getPendingReviews: asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, ReviewQuery>, res: Response) => {
    const { page = '1', limit = '20' } = req.query;
    const result = await reviewService.getPendingReviews({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
    return success(res, result, 'Pending reviews retrieved successfully');
  }),

  approveReview: asyncHandler(async (req: AuthenticatedRequest<ReviewParams>, res: Response) => {
    const authReq = req;
    const { id } = req.params;
    const review = await reviewService.approveReview(id, authReq.user!.id);
    return success(res, review, 'Review approved successfully');
  }),

  rejectReview: asyncHandler(async (req: AuthenticatedRequest<ReviewParams, unknown, RejectBody>, res: Response) => {
    const authReq = req;
    const { id } = req.params;
    const { reason } = req.body;
    const review = await reviewService.rejectReview(id, authReq.user!.id, reason);
    return success(res, review, 'Review rejected successfully');
  }),
};

export = reviewController;
