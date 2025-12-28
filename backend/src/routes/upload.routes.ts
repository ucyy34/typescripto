/**
 * Upload Routes
 * Handles file uploads for products (images)
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { StatusCodes } from 'http-status-codes';

import uploadController from '../controllers/upload.controller';
import { authenticate, requireSeller } from '../middlewares/auth';

const router: Router = Router();

// Multer configuration
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`) as any;
      error.code = 'LIMIT_FILE_TYPE';
      cb(error, false);
    } else {
      cb(null, true);
    }
  },
});

// Error handler for multer errors
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(StatusCodes.REQUEST_TOO_LONG).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
        error: { code: 'FILE_TOO_LARGE', maxSize: '10MB' }
      });
    }
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message,
      error: { code: err.code }
    });
  }

  if (err.code === 'LIMIT_FILE_TYPE') {
    return res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE).json({
      success: false,
      message: err.message,
      error: { code: 'INVALID_FILE_TYPE', allowed: ALLOWED_MIME_TYPES }
    });
  }

  next(err);
};

router.post('/products', authenticate, requireSeller, upload.single('image'), handleMulterError, uploadController.uploadProductImage);

export = router;
