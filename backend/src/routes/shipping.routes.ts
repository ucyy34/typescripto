/**
 * Shipping Routes
 */

import { Router } from 'express';

import ctrl from '../controllers/shipping.controller';
import { validate, validateParams } from '../middlewares/validate';
import { authenticate, requireSellerOrAdmin, validateStoreOwnership } from '../middlewares/auth';
import { trackingRateLimiter } from '../middlewares/rateLimiter';
import * as v from '../validators/shipping.validator';

const router: Router = Router();

// Public: rate hesaplama
router.post('/rates', validate(v.ratesSchema), ctrl.getRates);

// Seller/Admin: sevkiyat oluşturma
router.post(
  '/stores/:storeId/shipments',
  authenticate,
  requireSellerOrAdmin,
  validateStoreOwnership,
  validate(v.createShipmentSchema),
  ctrl.createShipment
);

// Seller/Admin: gönderi detay
router.get(
  '/stores/:storeId/shipments/:id',
  authenticate,
  requireSellerOrAdmin,
  validateStoreOwnership,
  validateParams(v.paramsWithId),
  ctrl.getShipment
);

// Seller/Admin: gönderi iptal
router.post(
  '/stores/:storeId/shipments/:id/cancel',
  authenticate,
  requireSellerOrAdmin,
  validateStoreOwnership,
  validateParams(v.paramsWithId),
  ctrl.cancelShipment
);

// Public: tracking
router.get('/track/:trackingNumber', trackingRateLimiter, validateParams(v.paramsTrack), ctrl.track);

export = router;
