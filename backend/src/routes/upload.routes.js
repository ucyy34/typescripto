const express = require('express');
const multer = require('multer');
const { StatusCodes } = require('http-status-codes');

const router = express.Router();

const uploadController = require('../controllers/upload.controller');
const { authenticate, requireSeller } = require('../middlewares/auth');
const { uploadLimiter } = require('../middlewares/rateLimiter');
const { ApiError } = require('../middlewares/errorHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new ApiError('Only image uploads are allowed', StatusCodes.BAD_REQUEST));
      return;
    }

    cb(null, true);
  },
});

router.post(
  '/products',
  authenticate,
  requireSeller,
  uploadLimiter,
  upload.single('image'),
  uploadController.uploadProductImage
);

module.exports = router;
