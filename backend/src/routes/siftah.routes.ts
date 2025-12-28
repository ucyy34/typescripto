/**
 * Siftah Routes
 * API endpoints for the siftah recommendation system
 */

import { Router } from 'express';

import siftahController from '../controllers/siftah.controller';
import { optionalAuth } from '../middlewares/auth';
import { validateQuery } from '../middlewares/validate';
import { siftahQuerySchema } from '../validators/siftah.validator';

const router: Router = Router();

router.get('/recommendations', optionalAuth, validateQuery(siftahQuerySchema), siftahController.getRecommendations);

export = router;
