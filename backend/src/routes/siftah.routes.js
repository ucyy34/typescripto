/**
 * Siftah Routes
 * API endpoints for the siftah recommendation system
 */

const express = require('express');
const router = express.Router();
const siftahController = require('../controllers/siftah.controller');
const { optionalAuth } = require('../middlewares/auth');
const { validateQuery } = require('../middlewares/validate');
const { siftahQuerySchema } = require('../validators/siftah.validator');

/**
 * GET /api/siftah/recommendations
 * 
 * Query Parameters:
 * - product_id (required): UUID of the product being viewed
 * 
 * Response:
 * - has_recommendation: boolean
 * - product: object (if has_recommendation is true)
 * - reason: string (if has_recommendation is false)
 */
router.get(
    '/recommendations',
    optionalAuth,
    validateQuery(siftahQuerySchema),
    siftahController.getRecommendations
);

module.exports = router;
