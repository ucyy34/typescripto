const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/shipping.controller');
const { validate, validateParams } = require('../middlewares/validate');
const { authenticate, requireSellerOrAdmin, validateStoreOwnership } = require('../middlewares/auth');
const { trackingRateLimiter } = require('../middlewares/rateLimiter');
const v = require('../validators/shipping.validator');

// Public: rate hesaplama (opsiyonel: auth eklenebilir)
router.post('/rates', validate(v.ratesSchema), ctrl.getRates);

// Seller/Admin: sevkiyat oluşturma
router.post(
  '/stores/:storeId/shipments',
  authenticate,
  requireSellerOrAdmin,
  validateStoreOwnership,  // ✅ SECURITY FIX: Store ownership validation
  validate(v.createShipmentSchema),
  ctrl.createShipment
);

// Seller/Admin: gönderi detay
router.get(
  '/stores/:storeId/shipments/:id',
  authenticate,
  requireSellerOrAdmin,
  validateStoreOwnership,  // ✅ SECURITY FIX: Store ownership validation
  validateParams(v.paramsWithId),
  ctrl.getShipment
);

// Seller/Admin: gönderi iptal
router.post(
  '/stores/:storeId/shipments/:id/cancel',
  authenticate,
  requireSellerOrAdmin,
  validateStoreOwnership,  // ✅ SECURITY FIX: Store ownership validation
  validateParams(v.paramsWithId),
  ctrl.cancelShipment
);

// Public: tracking (with rate limiting)
router.get('/track/:trackingNumber', 
  trackingRateLimiter,  // ✅ SECURITY: Rate limiting to prevent abuse
  validateParams(v.paramsTrack), 
  ctrl.track
);

module.exports = router;
