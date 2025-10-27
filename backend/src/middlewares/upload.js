/**
 * Upload Middleware
 * Handles file uploads for product media using Multer
 */

const multer = require('multer');

// Allowed mime types for product images
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Use memory storage so we can process the file with Sharp before saving
const storage = multer.memoryStorage();

// Validate incoming files
const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
  error.message = 'Unsupported file type';
  cb(error);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit for product images
  },
  fileFilter,
});

// Single image upload handler for product images
const productImageUpload = upload.single('image');

module.exports = {
  productImageUpload,
};
