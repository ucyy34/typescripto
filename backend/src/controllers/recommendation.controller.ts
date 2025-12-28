/**
 * Recommendation Controller
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types
import _recommendationService from '../services/recommendation.service';
const recommendationService = _recommendationService as any;

import { success } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

class RecommendationController {
  getRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { limit, cartProductIds, wishlistProductIds } = req.query;
    const normalizedLimit = Math.min(parseInt(limit as string, 10) || 8, 24);
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
