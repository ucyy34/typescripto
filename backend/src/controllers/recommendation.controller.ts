/**
 * Recommendation Controller
 */

import { Request, Response } from 'express';

import recommendationService = require('../services/recommendation.service');

import { success } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface RecommendationQuery {
  limit?: string;
  cartProductIds?: string | string[];
  wishlistProductIds?: string | string[];
}

class RecommendationController {
  getRecommendations = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, unknown, RecommendationQuery>, res: Response) => {
    const authReq = req;
    const { limit, cartProductIds, wishlistProductIds } = req.query;
    const normalizedLimit = Math.min(parseInt(limit || '8', 10) || 8, 24);
    const products = await recommendationService.getRecommendations({
      userId: authReq.user?.id,
      limit: normalizedLimit,
      cartProductIds,
      wishlistProductIds,
    });
    return success(res, { products }, 'Recommendations retrieved successfully');
  });
}

export = new RecommendationController();
