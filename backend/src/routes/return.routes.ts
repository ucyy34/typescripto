/**
 * Return Request Routes
 * Routes for handling product returns
 */

import { Router } from 'express';

import returnController from '../controllers/return.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate, validateParams, validateQuery } from '../middlewares/validate';
import {
  createReturnRequestSchema,
  updateReturnStatusSchema,
  returnIdParamSchema,
  returnQuerySchema,
} from '../validators/return.validator';

const router: Router = Router();

router.post('/', authenticate, validate(createReturnRequestSchema), returnController.createReturnRequest);

router.get('/', authenticate, validateQuery(returnQuerySchema), returnController.getUserReturns);

router.get('/:id', authenticate, validateParams(returnIdParamSchema), returnController.getReturnRequest);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('seller', 'admin'),
  validateParams(returnIdParamSchema),
  validate(updateReturnStatusSchema),
  returnController.updateReturnStatus
);

router.post('/:id/cancel', authenticate, validateParams(returnIdParamSchema), returnController.cancelReturnRequest);

router.get('/stores/:storeId', authenticate, requireRole('seller', 'admin'), returnController.getStoreReturns);

export = router;
