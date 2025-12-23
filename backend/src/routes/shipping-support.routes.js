/**
 * Shipping Support Routes
 * Routes for shipping support calculation and management
 */

const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shipping-support.controller');
const { authenticate, optionalAuth, requireAdmin, requireSeller } = require('../middlewares/auth');

// Public/Cart endpoints
router.post('/calculate', optionalAuth, shippingController.calculateCartShipping);
router.get('/default', shippingController.getDefaultCost);
router.put('/default', authenticate, requireAdmin, shippingController.updateDefaultCost);

// Admin endpoints
router.get('/admin/rules', authenticate, requireAdmin, shippingController.getAllRules);
router.post('/admin/rules', authenticate, requireAdmin, shippingController.createRule);
router.put('/admin/rules/:id', authenticate, requireAdmin, shippingController.updateRule);
router.delete('/admin/rules/:id', authenticate, requireAdmin, shippingController.deleteRule);
router.get('/admin/report', authenticate, requireAdmin, shippingController.getShippingReport);
router.put('/admin/store-charge', authenticate, requireAdmin, shippingController.updateStoreChargePercentage);
router.put('/admin/max-cap', authenticate, requireAdmin, shippingController.updateMaxShippingCap);

// Vendor endpoints
router.get('/store/:storeId', authenticate, shippingController.getStoreSettings);
router.put('/store/:storeId', authenticate, requireSeller, shippingController.updateStoreSettings);

module.exports = router;
