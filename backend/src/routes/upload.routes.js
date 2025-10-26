const express = require('express');
const multer = require('multer');
const { StatusCodes } = require('http-status-codes');

const uploadController = require('../controllers/upload.controller');
const { authenticate, requireSeller } = require('../middlewares/auth');
const { ApiError } = require('../middlewares/errorHandler');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new ApiError('Only image files are allowed', StatusCodes.BAD_REQUEST));
    } else {
      cb(null, true);
    }
  },
});

router.post('/products', authenticate, requireSeller, upload.single('image'), uploadController.uploadProductImage);

module.exports = router;
