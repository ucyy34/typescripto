const { StatusCodes } = require('http-status-codes');
const uploadService = require('../services/upload.service');
const { asyncHandler } = require('../middlewares/errorHandler');
const { success } = require('../utils/response');
const { ApiError } = require('../middlewares/errorHandler');

class UploadController {
  uploadProductImage = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError('No file uploaded', StatusCodes.BAD_REQUEST);
    }

    if (!req.file.buffer || req.file.size === 0) {
      throw new ApiError('Uploaded file is empty', StatusCodes.BAD_REQUEST);
    }

    const result = await uploadService.saveProductImage(req.file.buffer, req.file.originalname);

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    const data = {
      url: `${baseUrl}${result.relativePath}`,
      path: result.relativePath,
      original: result.original,
      optimized: result.optimized,
    };

    return success(res, data, 'Image uploaded successfully');
  });
}

module.exports = new UploadController();
