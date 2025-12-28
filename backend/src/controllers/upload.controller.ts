/**
 * Upload Controller
 * Handles image uploads for products
 */

import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { ApiError, asyncHandler } from '../middlewares/errorHandler';
import { success } from '../utils/response';

// Upload directories
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');

const ensureUploadDirs = async () => {
  await fs.promises.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
};

const buildUrl = (relativePath: string): string => {
  const base = process.env.PUBLIC_BASE_URL || '';
  return base ? `${base}${relativePath}` : relativePath;
};

interface MulterRequest extends Request {
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

class UploadController {
  uploadProductImage = asyncHandler(async (req: Request, res: Response) => {
    const multerReq = req as MulterRequest;
    if (!multerReq.file) {
      throw new ApiError('No image file provided', StatusCodes.BAD_REQUEST);
    }

    await ensureUploadDirs();

    const fileId = uuidv4();
    const fileName = `${Date.now()}-${fileId}.webp`;
    const filePath = path.join(PRODUCT_UPLOAD_DIR, fileName);

    try {
      await sharp(multerReq.file.buffer)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(filePath);
    } catch (error) {
      console.error('[upload] Failed to process image:', error);
      throw new ApiError('Failed to process image', StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const relativePath = `/uploads/products/${fileName}`;
    const absoluteUrl = buildUrl(relativePath);

    return success(res, { url: absoluteUrl, path: relativePath, fileName }, 'Image uploaded successfully');
  });
}

export = new UploadController();
