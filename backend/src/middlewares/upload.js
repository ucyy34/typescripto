/**
 * Upload Middleware
 * Multer configuration for handling file uploads
 */

const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const { ApiError } = require('./errorHandler');

// Allowed mime types for product images
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Use memory storage so we can process images with sharp before saving
const memoryStorage = multer.memoryStorage();

/**
 * Validate uploaded file type
 */
const productImageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError('Unsupported image format. Please upload JPG, PNG, GIF or WebP files.', StatusCodes.BAD_REQUEST));
  }
};

const productImageUpload = multer({
  storage: memoryStorage,
  fileFilter: productImageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size
  },
});

module.exports = {
  productImageUpload,
};
