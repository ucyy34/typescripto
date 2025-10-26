const express = require('express');
const router = express.Router();

const recommendationController = require('../controllers/recommendation.controller');
const { optionalAuth } = require('../middlewares/auth');
const { validateQuery } = require('../middlewares/validate');
const { recommendationQuerySchema } = require('../validators/recommendation.validator');

router.get(
  '/',
  optionalAuth,
  validateQuery(recommendationQuerySchema),
  recommendationController.getRecommendations
);

module.exports = router;
