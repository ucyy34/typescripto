/**
 * Recommendation Routes
 */

import { Router } from 'express';

import recommendationController from '../controllers/recommendation.controller';
import { optionalAuth } from '../middlewares/auth';
import { validateQuery } from '../middlewares/validate';
import { recommendationQuerySchema } from '../validators/recommendation.validator';

const router: Router = Router();

router.get('/', optionalAuth, validateQuery(recommendationQuerySchema), recommendationController.getRecommendations);

export = router;
