/**
 * Upload Routes
 */

const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/upload.controller');
const { authenticate, requireSellerOrAdmin } = require('../middlewares/auth');
const { uploadLimiter } = require('../middlewares/rateLimiter');
const { productImageUpload } = require('../middlewares/upload');

router.post(
  '/products',
  authenticate,
  requireSellerOrAdmin,
  uploadLimiter,
  productImageUpload.single('file'),
  uploadController.uploadProductImage
);

module.exports = router;
