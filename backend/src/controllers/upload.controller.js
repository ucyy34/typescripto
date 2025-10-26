/**
 * Upload Controller
 * Handles file uploads and image processing
 */

const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { StatusCodes } = require('http-status-codes');

const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { success } = require('../utils/response');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');

/**
 * Ensure upload directory exists
 */
async function ensureUploadDirectory() {
  await fs.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
}

class UploadController {
  /**
   * Upload product image and convert to WebP
   */
  uploadProductImage = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError('No file uploaded', StatusCodes.BAD_REQUEST);
    }

    await ensureUploadDirectory();

    const fileId = uuidv4();
    const outputFileName = `${fileId}.webp`;
    const outputPath = path.join(PRODUCT_UPLOAD_DIR, outputFileName);

    // Auto-rotate and resize large images to a reasonable width
    const transformer = sharp(req.file.buffer).rotate();
    const metadata = await transformer.metadata();

    const MAX_WIDTH = 1600;
    const resizeOptions = {};
    if (metadata.width && metadata.width > MAX_WIDTH) {
      resizeOptions.width = MAX_WIDTH;
    }

    await sharp(req.file.buffer)
      .rotate()
      .resize(resizeOptions)
      .webp({ quality: 85 })
      .toFile(outputPath);

    const [fileStats, finalMetadata] = await Promise.all([
      fs.stat(outputPath),
      sharp(outputPath).metadata(),
    ]);

    const publicUrl = `/uploads/products/${outputFileName}`;

    return success(
      res,
      {
        url: publicUrl,
        filename: outputFileName,
        mime_type: 'image/webp',
        size: fileStats.size,
        width: finalMetadata.width || resizeOptions.width || metadata.width,
        height: finalMetadata.height || metadata.height,
        original_name: req.file.originalname,
      },
      'Image uploaded successfully'
    );
  });
}

module.exports = new UploadController();
