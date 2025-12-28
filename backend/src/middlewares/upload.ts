/**
 * Upload Middleware
 * Handles file uploads for product media using Multer
 */

import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

// Multer file type
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
}

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
const fileFilter = (req: Request, file: MulterFile, cb: FileFilterCallback): void => {
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

export {
    productImageUpload,
};

// CommonJS compatibility
module.exports = {
    productImageUpload,
};
