/**
 * Recommendation Controller
 */

const recommendationService = require('../services/recommendation.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class RecommendationController {
  getRecommendations = asyncHandler(async (req, res) => {
    const { limit, cartProductIds, wishlistProductIds } = req.query;
    const normalizedLimit = Math.min(parseInt(limit, 10) || 8, 24);

    const products = await recommendationService.getRecommendations({
      userId: req.user?.id,
      limit: normalizedLimit,
      cartProductIds,
      wishlistProductIds,
    });

    return success(res, { products }, 'Recommendations retrieved successfully');
  });
}

module.exports = new RecommendationController();
