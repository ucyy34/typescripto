/**
 * Variant Routes
 * API endpoints for product variant management
 */

const express = require('express');
const router = express.Router();
const variantController = require('../controllers/variant.controller');
const { authenticate, requireSellerOrAdmin } = require('../middlewares/auth');

// Public endpoint: Get variant types and values for dropdown
router.get('/types', variantController.getVariantTypes);
router.get('/types/:type/values', variantController.getVariantValues);

// Product variant CRUD (requires seller/admin auth)
router.get('/products/:productId/variants', variantController.getProductVariants);

router.post(
    '/products/:productId/variants',
    authenticate,
    requireSellerOrAdmin,
    variantController.addVariant
);

router.put(
    '/products/:productId/variants/:variantId',
    authenticate,
    requireSellerOrAdmin,
    variantController.updateVariant
);

router.delete(
    '/products/:productId/variants/:variantId',
    authenticate,
    requireSellerOrAdmin,
    variantController.deleteVariant
);

module.exports = router;

