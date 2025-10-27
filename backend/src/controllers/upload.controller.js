const path = require('path');
const fs = require('fs');
const { StatusCodes } = require('http-status-codes');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const { ApiError, asyncHandler } = require('../middlewares/errorHandler');
const { success } = require('../utils/response');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');

const ensureUploadDirs = async () => {
  await fs.promises.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
};

class UploadController {
  uploadProductImage = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError('No image file provided', StatusCodes.BAD_REQUEST);
    }

    await ensureUploadDirs();

    const fileId = uuidv4();
    const fileName = `${Date.now()}-${fileId}.webp`;
    const filePath = path.join(PRODUCT_UPLOAD_DIR, fileName);

    try {
      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(filePath);
    } catch (error) {
      console.error('[upload] Failed to process image:', error);
      throw new ApiError('Failed to process image', StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const relativePath = `/uploads/products/${fileName}`;

    return success(res, { url: relativePath, fileName }, 'Image uploaded successfully');
  });
}

module.exports = new UploadController();
