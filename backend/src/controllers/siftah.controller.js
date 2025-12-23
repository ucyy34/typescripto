/**
 * Siftah Controller
 * Handles HTTP requests for siftah recommendation endpoints
 */

const siftahService = require('../services/siftah.service');
const { StatusCodes } = require('http-status-codes');

class SiftahController {
    /**
     * GET /api/siftah/recommendations
     * Returns a siftah recommendation for a given product
     */
    async getRecommendations(req, res, next) {
        try {
            const { product_id } = req.query;

            const result = await siftahService.getSiftahRecommendation(product_id);

            res.status(StatusCodes.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SiftahController();
